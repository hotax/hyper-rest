const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const clients = mongoose.model(
    'OAuthClients',
    new Schema({
        ClientType: {
            type: String
        },
        appType: {
            type: String
        }, // "native" or "web". If omitted, web is used as the default value.
        clientId: {
            type: String
        },
        clientName: {
            type: String
        },
        clientSecret: {
            type: String
        },
        redirectUris: {
            type: Array
        },
        responseTypes: {
            type: Array
        },
        grantTypes: {
            type: Array
        },
        accessTokenLifetime: {
            type: Number
        },
        refreshTokenLifetime: {
            type: Number
        },
        logoUri: {
            type: String
        },
        policyUri: {
            type: String
        },
        clientUri: {
            type: String
        }
    })
);

module.exports = clients;