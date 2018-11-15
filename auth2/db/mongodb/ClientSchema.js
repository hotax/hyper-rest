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
    }, {
        toJSON: {
            transform: function (doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                for (var prop in doc) {
                    if (doc[prop] instanceof Date) {
                        ret[prop] = doc[prop].toJSON();
                    }
                }
            }
        }
    })
);

module.exports = clients;