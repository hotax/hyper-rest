const logger = require('../../app/Logger'),
    ObjectID = require('mongodb').ObjectID,
    createErrorReason = require('../../app').createErrorReason;

module.exports = function (id) {
    try {
        return ObjectID(id);
    }
    catch (err) {
        logger.error(err.stack);
        return Promise.reject(createErrorReason(404, err.stack));
    }
}