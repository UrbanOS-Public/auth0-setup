const crypto = require('crypto'); 
const generateAPIKey = () => { 
	const rand = crypto.randomBytes(24); 
	const charSet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	let apiKey = "";
	rand.forEach(byte => {
		let index = byte % charSet.length;
		apiKey += charSet[index];
	})
	return apiKey
} 
exports.onExecutePostLogin = async (event, api) => { 
	if (event.user.app_metadata.apiKey) { 
		console.log('API Key already exists and will not be recreated.'); 
		return; 
	} 
	const apiKey = generateAPIKey();
	api.user.setAppMetadata("apiKey", apiKey); 
};