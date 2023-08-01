exports.onExecutePostLogin = async (event, api) => {
    if (!event.user.email_verified) {
      api.access.deny('You must verify your email before you can save workspaces. Please check your email for the verification link.');
    }
  };
  