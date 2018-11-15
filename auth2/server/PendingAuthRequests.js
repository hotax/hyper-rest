const Promise = require('bluebird'),
    schema = require('../db/mongodb/PendingAuthRequestsSchema'),
    dbSave = require('../../db/mongoDb/SaveObjectToDb'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;
const errMsg = 'the pending requestnot found';

const pendingAuthRequests = {
    find: function (code) {
        var id;
        try {
            id = ObjectId(code);
        } catch (err) {
            return Promise.reject(errMsg);
        };
        var req;
        return schema.findById(id)
            .then(function (doc) {
                if (!doc) return Promise.reject(errMsg);
                req = doc.request;
                return doc.remove();
            })
            .then(function(){
                return req;
            })
    },
    save: function (data) {
        return dbSave(schema, {
                request: data
            })
            .then(function (doc) {
                return doc.toJSON().id;
            })
    }
}
module.exports = pendingAuthRequests;