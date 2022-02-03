Note: This repo includes configuration for the Hercules environment. Configuration for the legacy Smart Columbus environment can be found here: https://github.com/UrbanOS-Examples/auth0-setup

# Auth0 Setup

This project is a set of tools made for programmatically setting up Auth0 tenants for local, Development, Staging, and Production environments. This repo is set up to set up Auth0 for the SmartColumbusOS project. Once you follow the steps below, you can change the URLs, Client ID, and other configuration settings to suite your project and then run the script against your Auth0 tenants.

Q. What is Auth0 and why would I want to use this?
A. Auth0 is an technology that "Auth0 provides authentication and authorization as a service." https://auth0.com/docs/getting-started/overview

Auth0 provides "tenants" which are independent isolated environments that each have their own set of configuration, users, and endpoints. Their recommendation is to set up one tenant per environment: Development, Staging (aka Testing), and Production.

## Setting Up New Auth0 Tenants

Before the tools in this repo can be used, you first need to set up the new tenants. There is not an API for creating new tenants. However, the following steps will set up a tenant in the simplest way possible allowing the tenant to be managed by these tools.

1. Create tenant and pick a name - example `smartcolumbusos-dev` **IMPORTANT** THE TENANT NAME CANNOT BE CHANGED This is the subdomain used by auth0 for the endpoint. tenantname.auth0.com
2. Go to https://support.auth0.com/tenants/public and verify the correct environment is set (Development, Staging, Production) Auth0 defaults new tenants to be in the "Development" environment.
3. Login to the new tenant. Go to the "Applications" section. Create a new "Machine to Machine" application and call it `Auth0 Management`. Select all permissions. This will be the "application" we use to set up the rest of the tenant.
4. Copy the Client ID from the application you created in the previous step. This will be the ID to use for the API to update the Auth0 configuration
5. Save this id as the client ID in the Auth0 setup JSON file for the current environment for example `config/dev.json`.
6. In the Auth0 management page, delete the Default Application named "Default App" This is not needed.
7. Go to the `Auth0 Management` application you created and find the Client Secret. Copy this, it is required to communicate with the Auth0 API.
8. Once you have the json files setup and have the Client Secret, you can run the auth0_setup script. You will need the JSON file for whichever tenant you want to setup and the CLIENT_SECRET from the previous step.

```
// Tested with node v14.17.5 Jan2022
npm install
node auth0_setup.js config/dev.json
Enter client secret for 'Auth0 Management' access: CLIENT_SECRET
```

**Todo:** Find a way to include this in the auth0_setup.js:


9. To ensure Andi has the proper permissions, visit the APIs section, Auth0
Management API, "Machine to Machine Applications" section, and turn Andi to
"Authorized".

    - In the dialog that opens underneath, grant Andi the `read:roles`, `read:client_grants`, `read:users`, and `read:users_app_metadata` permissions. Be sure to press "update" to activate these changes.


10. Repeat the above steps for each tenant you want for your environments.

**Note:** In step 3 above, if all permissions were not selected, it may be necessary to go back and add additional permissions at a later date. If you start seeing messages that include `insufficient scope` returned by the API, you are likely missing necessary permissions. To do this: navigate to Applications -> APIs -> Auth0 Management API. On the Auth0 Management API menu, select "Machine to Machine Applications." Click the down arrow next to the "Auth0 Management list item and check the additional required permissions.

### Manual Steps

Ensure that, for new applications, under "Advanced Settings", the following Grant Types are selected: "Implicit", "Authorization Code", "Refresh Token", and "Client Credentials". (Client Credentials may not be selected by default.)

For some pieces of configuration, Auth0 does not support API based updates.

#### CloudWatch Logging Extension - Install and Configure

Before you start, make sure that AWS has been set up with the appropriate logging user, group and stream for Auth0 to point to. This should be done if `common` is up to date and run against an environment. In this case, for example, the staging environment should have:

- a user with a name of `staging-auth0-logger` (as well as a generated access key id and secret access key)
- a log group with a name of `staging-auth0`
- a log stream with a name of `staging-auth0`

After you have that set up, keep those details handy, and, after navigating and logging into the auth0 site, switch to the relevant tenant and dashboard by clicking on your username, then the tenant name (in this case `scos-staging`), then the dashboard:
![image](https://user-images.githubusercontent.com/31485710/83555879-fb0e4c00-a4dc-11ea-9d10-fcf315cdf995.png)
![image](https://user-images.githubusercontent.com/31485710/83555984-27c26380-a4dd-11ea-8c44-86dd4a1e43ec.png)
![image](https://user-images.githubusercontent.com/31485710/83556108-54767b00-a4dd-11ea-8120-9a00e627c098.png)

Once you're at the dashboard, click on the `Extensions` button on the left navigation bar:
![image](https://user-images.githubusercontent.com/31485710/83556236-8ab3fa80-a4dd-11ea-9e96-fc7808726bf3.png)

Once you're in the `Extensions` section, click into the search bar, enter `cloudwatch` and click on the `Logs to CloudWatch` item.
![image](https://user-images.githubusercontent.com/31485710/83556315-aae3b980-a4dd-11ea-8d77-07cddaa88bf8.png)

This should pop open a model where you can scroll down to enter details for the environment (once again, staging, in this case) and click on the `Install` button:

- the log group `staging-auth0`
- the log stream `staging-auth0`
- an access key id for the `staging-auth0-logger` user
- a secret access key for the `staging-auth0-logger` user
- the region where the log and user were setup (in this case, `us-west-2`)
  ![image](https://user-images.githubusercontent.com/31485710/83556900-b08dcf00-a4de-11ea-8ea9-28b2122f5e4c.png)

Once you've completed these steps, within 5 minutes you should see logs flows to the CloudWatch log group in question.
