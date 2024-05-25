/**
 * Created by clx on 2017/10/14.
 */
const mongoose = require('mongoose'),
    promise = require('bluebird');

module.exports = async function (onOpen, connStr) {
    mongoose.Promise = promise;
    connStr = connStr || process.env.MONGODB;
    mongoose.connection.on('open', onOpen);
    return await mongoose.connect(dbURI, {
        autoIndex:true
    })
}