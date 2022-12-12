const fs = require("fs");
const util = require("util");
const _ = require("lodash");
const path = require("path");
const ManagementClient = require("auth0").ManagementClient;
const PromptsManager = require("auth0/src/management/PromptsManager.js");
const prompt = require("prompt-sync")();

let management;

function setup() {
  if (process.argv.length <= 2) {
    console.log("Missing required arguments: [config file]");
    process.exit(-1);
  }

  const [_nodePath, _scriptPath, configFile] = process.argv;
  const clientSecret = prompt(
    "Enter client secret for 'Auth0 Management' access: ",
    { echo: "*" }
  );

  const config = require(path.resolve(configFile));

  management = new ManagementClient({
    domain: config.domain,
    clientId: config.clientId,
    clientSecret: clientSecret,
  });

  const prompts = new PromptsManager({
    baseUrl: util.format("https://%s/api/v2", config.domain),
    headers: {
      "User-agent": "node.js/" + process.version.replace("v", ""),
      "Content-Type": "application/json",
    },
    tokenProvider: management.tokenProvider,
  });

  const componentDefinitions = getComponentDefinitions(config);

  return {
    prompts: prompts,
    config: config,
    componentDefinitions: componentDefinitions,
  };
}

async function main() {
  const { prompts, config, componentDefinitions } = setup();

  await management.updateTenantSettings(componentDefinitions.tenantSettings);
  logMessage("Success updating tenant settings");

  await prompts.updateSettings({}, componentDefinitions.universalLogin);
  logMessage("Success updating universal login");

  const oldApis = await management.getResourceServers();
  const nonSystemOldApis = oldApis.filter((api) => !api.is_system);
  const apiParams = {
    type: "API",
    idFieldName: "id",
    fieldToMatchOn: "name",
    createFn: management.createResourceServer,
    updateFn: updateResourceServer,
  };
  await updateComponents(
    nonSystemOldApis,
    componentDefinitions.apis,
    apiParams
  );

  const oldClients = await management.getClients();
  const clientParams = {
    type: "Client",
    idFieldName: "client_id",
    fieldToMatchOn: "name",
    createFn: management.createClient,
    updateFn: management.updateClient,
  };

  await updateComponents(
    oldClients,
    componentDefinitions.clients,
    clientParams
  );

  const oldGrants = await management.getClientGrants();
  const clients = await management.getClients();

  componentDefinitions.clientGrants.forEach((grant) => {
      grant.client_id = findMatchingClientId(grant.name, clients);
  });

  const grantParams = {
      type: "Client Grant",
      idFieldName: "id",
      fieldToMatchOn: "client_id",
      createFn: management.createClientGrant,
      updateFn: management.updateClientGrant
  }

  await updateComponents(oldGrants, componentDefinitions.clientGrants, grantParams);

  const oldConnections = await management.getConnections();
  const newConnections = await fillInConnectionConfigurations(
    componentDefinitions.connections,
    config
  );
  const connectionParams = {
    type: "Connection",
    idFieldName: "id",
    fieldToMatchOn: "name",
    createFn: management.createConnection,
    updateFn: management.updateConnection,
  };

  await updateComponents(oldConnections, newConnections, connectionParams);

  const oldRules = await management.getRules();
  const ruleParams = {
    type: "Rule",
    idFieldName: "id",
    fieldToMatchOn: "name",
    createFn: management.createRule,
    updateFn: management.updateRule,
  };

  await updateComponents(oldRules, componentDefinitions.rules, ruleParams);

  const oldRoles = await management.getRoles();
  const roleParams = {
    type: "Role",
    idFieldName: "id",
    fieldToMatchOn: "name",
    createFn: management.createRole,
    updateFn: management.updateRole,
  };

  await updateComponents(oldRoles, componentDefinitions.roles, roleParams);

  const oldFactors = await management.guardian.getFactors();
  const factorParams = {
    type: "Factor",
    idFieldName: "name",
    fieldToMatchOn: "name",
    createFn: management.guardian.updateFactor,
    updateFn: management.guardian.updateFactor,
  };

  await updateComponents(
    oldFactors,
    componentDefinitions.guardian.factors,
    factorParams
  );

  const oldActions = await management.actions.getAll();
  const actionParams = {
    type: "Action",
    idFieldName: "id",
    fieldToMatchOn: "name",
  };

  await updateActions(
    oldActions.actions,
    componentDefinitions.actions,
    actionParams
  );
  await updatePostLoginBindings(componentDefinitions.postLoginFlow);
}

async function fillInConnectionConfigurations(connections, config) {
  const clientEnabledInConfig = ({ name }) => {
    return config.enabledClients.includes(name);
  };
  const extractClientId = ({ client_id }) => {
    return client_id;
  };
  const updateEnabledClients = (clients, connection) => {
    connection["enabled_clients"] = clients;
    return connection;
  };

  const connectionsUserWantsToCreate = connections.filter(
    userWantsToCreateConnection
  );

  const connectionsWithSecrets = connectionsUserWantsToCreate
    .filter(connectionHasSecrets)
    .map(promptForConnectionSecrets);

  const connectionsWithoutSecrets = connectionsUserWantsToCreate.filter(
    connectionWithoutSecrets
  );

  const currentClients = await management.getClients();
  const enabledClientIds = currentClients
    .filter(clientEnabledInConfig)
    .map(extractClientId);

  const connectionsToCreate = connectionsWithSecrets.concat(
    connectionsWithoutSecrets
  );

  return connectionsToCreate.map(
    _.partial(updateEnabledClients, enabledClientIds)
  );
}

function getComponentDefinitions(config) {
  const customLoginPage = getCustomLoginPage();

  const rawComponents = fs.readFileSync("components.json", "utf8");
  const templatedComponents = _.template(rawComponents)(
    Object.assign({}, config, { customLoginPage: customLoginPage })
  );
  return JSON.parse(templatedComponents);
}

function getCustomLoginPage() {
  return fs
    .readFileSync("custom-login-page.html", "utf8")
    .trim()
    .replace(new RegExp('"', "g"), "'")
    .replace(new RegExp("\n", "g"), "\\n");
}

function updateResourceServer(params, resourceApi) {
  updatedResourceApi = Object.assign({}, resourceApi);
  delete updatedResourceApi.identifier;
  return management.updateResourceServer(params, updatedResourceApi);
}

async function updateComponents(
  oldComponents,
  newComponents,
  { type, idFieldName, fieldToMatchOn, createFn, updateFn }
) {
  const components = createListOfChanges(oldComponents, newComponents, fieldToMatchOn);
  const componentUpdatePromises = components.map(
    async ({ newComponent, oldComponent }) => {
      if (newComponent && oldComponent) {
        const params = createIdParam(oldComponent, idFieldName);
        const name = newComponent.name;
        delete newComponent.name;
        delete newComponent.strategy;
        delete newComponent.client_id;
        delete newComponent.audience;
        await updateFn(params, newComponent);
        logMessage(`Success updating ${name} ${type}`);
      } else if (newComponent) {
        await createFn(newComponent);
        logMessage(`Success creating ${newComponent.name} ${type}`);
      } else {
        logMessage(
          `Not touching uninvolved component ${oldComponent.name} ${type}`
        );
      }
    }
  );
  return Promise.all(componentUpdatePromises);
}

async function updateActions(oldActions, newActions, { type, idFieldName, fieldToMatchOn }) {
  const actions = createListOfChanges(oldActions, newActions, fieldToMatchOn);
  const componentUpdatePromises = actions.map(
    async ({ newComponent, oldComponent }) => {
      if (newComponent && oldComponent) {
        await updateAction(oldComponent, idFieldName, newComponent, type);
      } else if (newComponent) {
        await createAction(newComponent, idFieldName, type);
      } else {
        logMessage(
          `Not touching uninvolved component ${oldComponent.name} ${type}`
        );
      }
    }
  );

  return Promise.all(componentUpdatePromises);
}

async function updatePostLoginBindings(postLoginFlow) {
  const triggerParams = { trigger_id: "post-login" };
  await management.actions.updateTriggerBindings(triggerParams, {
    bindings: postLoginFlow,
  });
}

async function createAction(newAction, idFieldName, type) {
  newAction.code = fs.readFileSync(newAction.codePath).toString();
  delete newAction.codePath;
  const createdAction = await management.actions.create(newAction);
  await management.actions.deploy(createIdParam(createdAction, idFieldName));
  logMessage(`Success creating ${newAction.name} ${type}`);
}

async function updateAction(oldAction, idFieldName, newAction, type) {
  const params = createIdParam(oldAction, idFieldName);
  const name = newAction.name;
  newAction.code = fs.readFileSync(newAction.codePath).toString();
  delete newAction.codePath;
  await management.actions.update(params, newAction);
  await management.actions.deploy(params);
  logMessage(`Success updating ${name} ${type}`);
}

function createListOfChanges(oldComponents, newComponents, matchingField) {
  const components = [];

  newComponents.forEach((newComponent) => {
    const oldComponent =
      oldComponents.find((component) => component[matchingField] === newComponent[matchingField]) ||
      null;
    components.push({
      newComponent: newComponent,
      oldComponent: oldComponent,
    });
  });

  oldComponents.forEach((component) => {
    const doesNotExist =
      components.find(
        ({ oldComponent }) =>
          oldComponent !== null && component[matchingField] === oldComponent[matchingField]
      ) === undefined;
    if (doesNotExist) {
      components.push({
        newComponent: null,
        oldComponent: component,
      });
    }
  });

  return components;
}

function createIdParam(component, idFieldName) {
  const params = {};
  params[idFieldName] = component[idFieldName];
  return params;
}

function findMatchingClientId(name, clients) {
    return clients.filter((client) => client.name === name)?.[0]?.client_id;
}

function userWantsToCreateConnection({ name }) {
  const createConnection = prompt(
    `Do you want to create or update connection for ${name}? (y/n) [default: n]: `,
    "n"
  );
  return createConnection === "y";
}

function connectionHasSecrets({ name }) {
  return ["google-oauth2"].indexOf(name) >= 0;
}

function connectionWithoutSecrets(connection) {
  return !connectionHasSecrets(connection);
}

function promptForConnectionSecrets(connectionConfiguration) {
  const { name } = connectionConfiguration;
  connectionConfiguration["options"]["client_id"] = prompt(
    `Enter client id for ${name}: `,
    { echo: "*" }
  );
  if (!connectionConfiguration.options.client_id)
    throw "Error: client_id cannot be empty!";

  connectionConfiguration["options"]["client_secret"] = prompt(
    `Enter client secret for ${name}: `,
    { echo: "*" }
  );
  if (!connectionConfiguration.options.client_secret)
    throw "Error: client_secret cannot be empty!";

  return connectionConfiguration;
}

function logMessage(message) {
  console.log(`  * ${message}`);
}

async function logConnections() {
  const { prompts, config, componentDefinitions } = setup();

  management.getConnections().then((a) => {
    console.log(a);
    console.log(a[0].options);
    console.log(a[0].options.mfa);
  });
}

main();
