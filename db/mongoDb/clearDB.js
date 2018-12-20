var url = require('url'),
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

    var db = mongoose.connection.db;

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

    return function (done) {
        clearDB(done);
    };

    function clearDB(done) {
        if (db) return clearCollections(done);
        mongoose.connect(dbURI, {
            useNewUrlParser: true,
            /* other options */
        }, function (err, newDb) {
            if (err) return done(err);
            db = newDb;
            clearCollections(done);
        });
    }

    function clearCollections(done) {
        db.db.collections(function (err, collections) {
            if (err) return done(err);

            var todo = collections.length;
            if (!todo) return done();

            collections.forEach(function (collection) {
                if (collection.collectionName.match(/^system\./)) return --todo;
                if (options.skip instanceof Array && options.skip.indexOf(collection.collectionName) > -1) return --todo;

                collection.remove({}, {
                    safe: true
                }, function () {
                    if (--todo === 0) done();
                });
            });
        });
    }

    function closeDB() {
        db.close();
    }
};