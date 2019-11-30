/**
 * Created by clx on 2017/10/14.
 */
const mongoose = require('mongoose'),
    promise = require('bluebird');

module.exports = function (onOpen, connStr) {
    mongoose.Promise = promise;
    connStr = connStr || process.env.MONGODB;
    mongoose.connect(connStr, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true
    });
    mongoose.connection.on('open', onOpen);
}