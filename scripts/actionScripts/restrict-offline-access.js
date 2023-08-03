exports.onExecutePostLogin = async (event, api) => {
    var roles = (event.authorization || {}).roles || [];
    var scope = ((event.request || {}).query || {}).scope || '';
    var should_block_offline_access = scope.include('offline_access') && !roles.includes('Extended Access')

    if (should_block_offline_access) {
        api.access.deny('User is not authorized to request offline_access.');
    }
};
