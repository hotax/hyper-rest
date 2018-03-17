const session = require('express-session'),
    MongoDBStore = require('connect-mongodb-session')(session);

module.exports = function () {
    var store = new MongoDBStore(
        {
            uri: process.env.MONGODB,
            collection: 'sessions'
        });

    // Catch errors
    store.on('error', function (error) {
        assert.ifError(error);
        assert.ok(false);
    });

    return {
        attachTo: function (app) {
            // Use express session support since OAuth2orize requires it
            app.use(session({
                //cookie: {maxAge: 1000 * 60 * 60 * 24 * 7},// 1 week
                cookie: {maxAge: 1000 * 60 * 60 * 24},// 1 day
                secret: secret || 'super secret for session',
                saveUninitialized: false,
                resave: false,
                store: store
            }));
        }
    };
}