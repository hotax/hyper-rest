const session = require('express-session'),
    uuid = require('uuid-v4'),
    cookieParser = require('cookie-parser'),
    SocketIo = require('socket.io'),
    PassportSocketIo = require('passport.socketio'),
    KEY = 'express.sid',
    SECRET = process.env.SESSION_SECRET || 'super secret for session',
    DB_CONNECTION_STRING = process.env.MONGODB,
    SESSION_COLLECTION = process.env.SESSION_COLLECTION || 'sessions',
    COOKIE_SECURE = process.env.NODE_ENV === 'production',
    logger = require('../app/Logger'),
    MongoDBStore = require('connect-mongo')(session);

const onAuthorizeSuccess = function (data, accept) {
    logger.info('socket.io auth success');
    accept();
};

const onAuthorizeFail = function (data, message, error, accept) {
    // error indicates whether the fail is due to an error or just a unauthorized client
    if (error) {
        throw new Error(message);
    } else {
        logger.info(message);
        // the same accept-method as above in the success-callback
        accept(null, false);
    }
};

const sso = {
    url: DB_CONNECTION_STRING
};
logger.debug('session store creative options:' + JSON.stringify(sso));
const sessionStore = new MongoDBStore(sso);
const sessionOptions = {
    genid: function () {
        return uuid();
    },
    key: KEY,
    secret: SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: maxAge || 3 * 60 * 60 * 1000,
        secure: COOKIE_SECURE
    },
    store: sessionStore
};

module.exports = function (maxAge) {
    return {
        attachTo: function (app) {
            app.use(cookieParser(SECRET));
            app.use(session(sessionOptions));
        },
        authByServer: function (server) {
            logger.info('begin auth by server .......');
            const io = SocketIo(server);
            io.use(PassportSocketIo.authorize({
                cookieParser: cookieParser,
                key: KEY,
                secret: SECRET,
                store: sessionStore,
                success: onAuthorizeSuccess,
                fail: onAuthorizeFail
            }));
        }
    };
};