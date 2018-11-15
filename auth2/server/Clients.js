const Promise = require('bluebird'),
    __ = require('underscore');

const clients = function (findClient) {
    return {
        checkClient: function (clientId, redirectUri) {
            return findClient(clientId)
                .then(function (client) {
                    if (!client) return Promise.reject('Unknown client');
                    if (!__.contains(client.redirectUris, redirectUri)) {
                        return Promise.reject('Invalid redirect URI');
                    }
                    return client;
                })
        }
    }
}
module.exports = clients;