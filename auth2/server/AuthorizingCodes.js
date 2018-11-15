const Promise = require('bluebird'),
    schema = require('../db/mongodb/AuthorizingCodesSchema'),
    dbSave = require('../../db/mongoDb/SaveObjectToDb'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

const authCodes = {
    generate: function(data){
        return dbSave(schema, {
                request: data
            })
            .then(function (doc) {
                return doc.toJSON().id;
            })
    }
}
module.exports = authCodes;