const dbSave = require('../../../db/mongoDb/SaveObjectToDb'),
    clientSchema = require('./ClientSchema');

module.exports = {
    register: function (client) {
        return clientSchema.count({
                clientId: client.clientId
            })
            .then(function (c) {
                if (c === 0) {
                    return dbSave(clientSchema, client);
                }
                throw new Error('client id already exists!');
            })

    }
}