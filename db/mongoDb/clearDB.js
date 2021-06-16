var url = require('url'),
    {mapObject} = require('underscore'),
    mongoose = require('mongoose');

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

    let db = mongoose.connection;

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

    return function () {
        return clearDB();
    };

    function clearDB() {
        // if (db) return clearCollections(done);
        return mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useFindAndModify: false,
            useCreateIndex: true,
            useUnifiedTopology: true
            /* other options */
        })
        .then((conn) => {
            db = conn
            return clearCollections()
        })
    }

    function clearCollections() {
        colls = db.connection.collections
        let todo = []
        mapObject(colls, (val, key) => {
            todo.push(val.deleteMany({}, {
                safe: true
            })) 
        })
        return Promise.all(todo)
    }

    function closeDB() {
        return db.connection.close();
    }
};