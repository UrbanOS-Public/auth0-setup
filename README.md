# Auth0 Setup

This project is a set of tools made for programmatically setting up an Auth0 
tenant for use by UrbanOS environments. Once you follow the steps below, you can
change the URLs, Client ID, and other configuration settings to suite your 
project and then run the script against your Auth0 tenants.

Q. What is Auth0 and why would I want to use this?
A. Auth0 is an technology that "Auth0 provides authentication and authorization 
as a service." https://auth0.com/docs/getting-started/overview

Auth0 provides "tenants" which are independent isolated environments that each 
have their own set of configuration, users, and endpoints. Their recommendation 
is to set up one tenant per environment: Development, Staging (aka Testing), and
Production.

## Setting Up New Auth0 Tenants

Before the tools in this repo can be used, you first need to set up the new tenants. There is not an API for creating new tenants. However, the following steps will set up a tenant in the simplest way possible allowing the tenant to be managed by these tools.

1. Create tenant and pick a name - example `urbanos-dev` **IMPORTANT** THE TENANT NAME CANNOT BE CHANGED This is the subdomain used by auth0 for the endpoint. {tenantname}.us.auth0.com
2. Go to https://support.auth0.com/tenants/public and verify the correct environment is set (Development, Staging, Production) Auth0 defaults new tenants to be in the "Development" environment.
3. Login to the new tenant. Go to the "Applications" section. Create a new "Machine to Machine" application and call it `Auth0 Management`. Select all permissions. This will be the auth0 "application"
that the script in this repo uses to set up the rest of the tenant.
4. Copy the Client ID from the application you created in the previous step. This will be the ID to use for the API to update the Auth0 configuration
5. Save this id as the client ID in the Auth0 setup JSON file for the current environment for example `config/dev.json`.
Check Automatic Config Generation to get the rest of the information in the json file. Note: will have to change the domain and clientId fields.
6. In the Auth0 management page, delete the Default Application named "Default App" This is not needed.
7. Go to the `Auth0 Management` application you created and find the Client Secret. Copy this, it is required to communicate with the Auth0 API.
8. Once you have the json files setup and have the Client Secret, you can run the auth0_setup script. You will need the JSON file for whichever tenant you want to setup and the CLIENT_SECRET from the previous step.

```
// Tested with node v14.17.5 Jan2022
npm install
node auth0_setup.js config/dev.json
Enter client secret for 'Auth0 Management' access: CLIENT_SECRET
```

**Todo:** Find a way to include this step in the auth0_setup.js:

9. To ensure Andi has the proper permissions, visit the APIs section, Auth0
Management API, "Machine to Machine Applications" section, and turn Andi to
"Authorized".

    - In the dialog that opens underneath, grant Andi the `read:roles`, `read:client_grants`, `read:users`, and `read:users_app_metadata` permissions. Be sure to press "update" to activate these changes.


10. Repeat the above steps for each tenant you want for your environments.

**Note:** In step 3 above, if all permissions were not selected, it may be necessary to go back and add additional permissions at a later date. If you start seeing messages that include `insufficient scope` returned by the API, you are likely missing necessary permissions. To do this: navigate to Applications -> APIs -> Auth0 Management API. On the Auth0 Management API menu, select "Machine to Machine Applications." Click the down arrow next to the "Auth0 Management list item and check the additional required permissions.

### Manual Steps

Ensure that, for new applications other than Andi and UrbanOs, under "Advanced Settings", the following Grant Types are selected: "Implicit", "Authorization Code", "Refresh Token", and "Client Credentials". (Client Credentials may not be selected by default.)

For some pieces of configuration, Auth0 does not support API based updates.


## Automatic Config Generation
If you're using the latest version of the UrbanOS helm chart, the config will be generated for you and stored as a configmap. It can be retrieved with

```shell
kubectl get configmap auth0-config -o jsonpath='{.data.auth0\.config}' > auth0-config.json
```

This method requires that the `global.auth.auth0_management_client_id`, `global.ingress.dnsZone`, and `global.ingress.rootdnsZone` values be filled out.

Another method is to go into the environment's configmaps and copy the json portion of the auto0-config configmap and paste it in the json value

Note: use fullscreen mode "f" to copy what you need out of it or use copy "c" to copy the entire configmap to avoid formatting errors
