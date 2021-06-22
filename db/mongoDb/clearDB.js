var url = require('url'),
    {each} = require('underscore'),
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

    //let db = mongoose.connection;
    let db;
    
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
        return db ? clearCollections() : clearDB();
    };

    function clearDB() {
        return mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useFindAndModify: false,
            useCreateIndex: true,
            autoIndex:true,
            useUnifiedTopology: true
            /* other options */
        })
        .then((conn) => {
          db = conn.connection
            return clearCollections()
        })
    }


    function clearCollections() {
        let todo = []
        return db.db.collections()
            .then(colls => {
                each(colls, coll => {
                    if (coll.collectionName.match(/^system\./)) return;
                    if (options.skip instanceof Array && options.skip.indexOf(collection.collectionName) > -1) return;

                    todo.push(coll.deleteMany({}, {
                        safe: true
                    }))
                })
                return Promise.all(todo) 
            })
            .then(data => {
                return data
            })
            .catch(e => {
                throw e
            })
    }

    function closeDB() {
        return db.connection.close();
    }
};