const logger = require('../../app/Logger'),
    _ = require('underscore'),
    ObjectID = require('mongodb').ObjectID,
    createErrorReason = require('../../app').createErrorReason;

module.exports = function (id, create) {
    create = _.isBoolean(create) ? create : true;
    try {
        var result = ObjectID(id);
        if (!create) result = id;
        return Promise.resolve(result);
    }
    catch (err) {
        logger.error(err.stack);
        return Promise.reject(createErrorReason(404, err.stack));
    }
}