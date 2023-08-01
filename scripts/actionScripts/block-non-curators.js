exports.onExecutePostLogin = async (event, api) => {
    const audience = '' || (event.request && event.request.query && event.request.query.audience) || (event.request && event.request.body && event.request.body.audience);
    const assignedRoles = (event.authorization || {}).roles || [];

    if (audience === "andi" && !assignedRoles.includes("Curator")) {
        api.access.deny('You must have the "curator" role to access Andi');
    }
};
