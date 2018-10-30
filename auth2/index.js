const createClient = require('./OAuthClient'),
setHttpResponseStatus = require('../express/CreateError'),
buildAuthRequestUri = require('./AuthorizationRequestUrlBuilder'),
encodeCredentials = require('./EncodeCredentials'),
createClientState = require('./ClientState'),
createAuthCodeGrantRequestSender = require('./SendAuthCodeGrantRequest'),
clientCallbackEndpoint = require('./AuthorizationResponseCallback');

module.exports = {
    client: createClient({
        createHttpError: setHttpResponseStatus,
        authRequestUriBuilder: buildAuthRequestUri,
        encodeCredentials: encodeCredentials,
        clientStateFactory: createClientState,
        authCodeGrantRequestFactory: createAuthCodeGrantRequestSender,
        callbackFactory: clientCallbackEndpoint
    })
}