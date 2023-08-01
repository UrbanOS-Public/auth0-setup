exports.onExecutePostLogin = async (event, api) => {
    var roles = (event.authorization || {}).roles || [];

    if (roles.includes("Curator")) {
        api.multifactor.enable("any");
    }
};