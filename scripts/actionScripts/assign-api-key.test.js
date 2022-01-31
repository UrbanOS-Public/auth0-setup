const {onExecutePostLogin} = require('./assign-api-key')

const mockEvent = {
    user:{
        app_metadata: {}
    }
}

const api = {
    user: {
        setAppMetadata: function(key, value) { 
            mockEvent.user.app_metadata[key] = value 
        }
    }
}

const mockEventClear = () => {
    delete mockEvent.user.app_metadata.apiKey
}

describe('onExecutePostLogin', () => {
    test('generates a different api key with each invocation', () => {
        onExecutePostLogin(mockEvent, api)
        const firstApiKey = mockEvent.user.app_metadata.apiKey
        mockEventClear()
        onExecutePostLogin(mockEvent, api)
        const secondApiKey = mockEvent.user.app_metadata.apiKey
        mockEventClear()
        expect(firstApiKey).not.toEqual(secondApiKey)
    })
    test('does not generate an api key if one exists', () => {
        mockEvent.user.app_metadata.apiKey = 'sample'
        onExecutePostLogin(mockEvent, api)
        expect(mockEvent.user.app_metadata.apiKey).toEqual('sample')
        mockEventClear()
    })
    test('generates an api key when one does not exist', () => {
        onExecutePostLogin(mockEvent, api)
        expect(typeof mockEvent.user.app_metadata.apiKey).toEqual('string')
        expect(mockEvent.user.app_metadata.apiKey.length).toEqual(24)
        mockEventClear()
    })
})