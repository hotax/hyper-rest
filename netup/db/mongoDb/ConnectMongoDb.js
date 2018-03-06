/**
 * Created by clx on 2017/10/14.
 */
const mongoose = require('mongoose'),
    promise = require('bluebird');

module.exports = function (onOpen) {
    mongoose.Promise = promise;
    mongoose.connect(process.env.MONGODB, {
        useMongoClient: true,
        /* other options */
    });
    mongoose.connection.on('open', onOpen);
}