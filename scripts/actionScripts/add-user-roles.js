exports.onExecutePostLogin = async (event, api) => {
    const namespace = 'https://andi.smartcolumbusos.com';
    if (event.authorization) {
      api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
      api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    }
  }