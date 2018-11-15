const decodeCredentials = require('../EncodeCredentials').decode,
    parseCredentialsFactory = require('./ParseCredentialsFromAccessTokenRequest'),
    authenticateCredentials = require('../db/mongodb/Clients').authenticate,
    authenticateClient = require('./AuthenticateClient'),
    authServer = require('./AuthServer');

const createDefaultAuthServer = function () {
    var parseCredentials = parseCredentialsFactory(decodeCredentials);
    return authServer({
        authenticateClient: authenticateClient(parseCredentials, authenticateCredentials)
    });
}
module.exports = createDefaultAuthServer();