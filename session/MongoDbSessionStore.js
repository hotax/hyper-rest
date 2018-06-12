const session = require('express-session'),
    uuid = require('uuid-v4'),
    logger = require('../app/Logger'),
    MongoDBStore = require('connect-mongodb-session')(session);

module.exports = function (maxAge) {
    var store = new MongoDBStore(
        {
            uri: process.env.MONGODB,
            collection: process.env.SESSION_COLLECTION || 'sessions'
        });

    // Catch errors
    store.on('error', function (error) {
        logger.error('session store error:' + JSON.stringify(error));
    });

    return {
        attachTo: function (app) {
            // Use express session support since OAuth2orize requires it
            app.use(session({
                genid: function () {
                   return uuid();
                },
                key: 'express.sid',
                //cookie: {maxAge: 1000 * 60 * 60 * 24 * 7},// 1 week
                //cookie: {maxAge: 1000 * 60 * 60 * 24},// 1 day
                cookie: {
                    maxAge: maxAge || 1000 * 60 * 60 * 24,
                    secure: process.env.NODE_ENV === 'production'
                },
                secret: process.env.SESSION_SECRET || 'super secret for session',
                saveUninitialized: false,
                resave: false,
                store: store
            }));
        }
    };
}