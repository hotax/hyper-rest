const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    transformOption = require('../../../db/mongoDb/DocTransformOption');

const OAuthTokensModel = mongoose.model(
    'OAuthTokens',
    new Schema({
        accessToken: {
            type: String
        },
        accessTokenExpiresOn: {
            type: Date
        },
        client: {
            type: Object
        }, // `client` and `user` are required in multiple places, for example `getAccessToken()`
        clientId: {
            type: String
        },
        refreshToken: {
            type: String
        },
        refreshTokenExpiresOn: {
            type: Date
        },
        user: {
            type: Object
        },
        userId: {
            type: String
        }
    }, {
        toObject: {
            transform: function (doc, ret) {
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

module.exports = OAuthTokensModel;