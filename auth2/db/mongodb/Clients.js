const mongoose = require('mongoose'),
    Promise = require('bluebird'),
    dbSave = require('../../../db/mongoDb/SaveObjectToDb'),
    clientSchema = require('./ClientSchema'),
    ObjectId = mongoose.Types.ObjectId;

module.exports = {
    register: function (client) {
        return dbSave(clientSchema, client)
            .then(function (doc) {
                return doc.id.toString();
            })

    },
    findById: function (clientId) {
        var id;
        try {
            id = ObjectId(clientId);
        } catch (err) {
            return Promise.resolve(undefined);
        };

        return clientSchema.findById(id)
            .then(function (client) {
                return client ? client.toJSON() : undefined;
            });
    },
    authenticate: function (clientId, secret) {
        var id;
        try {
            id = ObjectId(clientId);
        } catch (err) {
            return Promise.resolve(false);
        };

        return clientSchema.findOne({
                id: id,
                secret: secret
            })
            .then(function (client) {
                return client ? true : false;
            })
    }
}