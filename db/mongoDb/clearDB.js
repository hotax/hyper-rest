const _ = require('lodash')
const mongoose = require('mongoose')
const connect = require('./ConnectMongoDb')

var beforeEachRegistered = false;
var afterHookRegistered = false;

module.exports = function (uriString, options) {
    options = options || {};

    if (typeof uriString == 'function') {
        throw new Error("Module being called to clean the db.  Please call the module with a mongodb url.");
    }

    if (!uriString) {
        console.warn("!WARNING: no mongodb url provided.  Defaulting to mongodb://localhost/test");
        uriString = 'mongodb://localhost/test';
    }

    let conn
    // Mongoose可通过conn.client调用Mongodb Client API
    
    if (!options.noClear && !beforeEachRegistered) {
        if ('function' == typeof beforeEach && beforeEach.length > 0) {
            // we're in a test suite that hopefully supports async operations
            beforeEach(clearDB);
            beforeEachRegistered = true;
        }
    }

    if (!options.noClear && !afterHookRegistered) {
        if ('function' == typeof after && after.length > 0) {
            // we're in a test suite that hopefully supports async operations
            after(closeDB);
            afterHookRegistered = true;
        }
    }

    async function clearDB() {
        const dbConn = await connect(()=>{}, dbURI)
        conn = dbConn.connection
        await clearCollections()
    }

    async function clearCollections() {
        const collections = _.values(conn.collections)
        for (const coll of collections) {
            if (!coll.name.match(/^system\./) && !(options.skip instanceof Array &&
                options.skip.indexOf(coll.name) < 0)) {
                await conn.db.collection(coll.name).deleteMany({})
            }
        }
    }

    function closeDB() {
        return conn.close();
    }

    return clearDB
};