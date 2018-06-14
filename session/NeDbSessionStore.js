const session = require('express-session'),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    uuid = require('uuid-v4'),
    SocketIo = require('socket.io'),
    PassportSocketIo = require('passport.socketio'),
    NedbStore = require('nedb-session-store'),
    KEY = 'express.sid',
    SECRET = process.env.SESSION_SECRET || 'super secret for session',
    logger = require('../app/Logger');

const onAuthorizeSuccess = function(data, accept){
    logger.debug('socket.io auth success');
    accept();
};

const onAuthorizeFail = function(data, message, error, accept){
    // error indicates whether the fail is due to an error or just a unauthorized client
    if(error){
        throw new Error(message);
    } else {
        logger.info(message);
        // the same accept-method as above in the success-callback
        accept(null, false);
    }
};

module.exports = function (options) {
    const NedbSessionStore = NedbStore(session);
    const sessionStore = new NedbSessionStore({
        filename: path.join('./db', 'session-store.db')
    });
    const sessionOptions = {
        genid: function () {
            return uuid();
        },
        key: KEY,
        secret: SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: {
            maxAge: 3 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production'
        },
        store: sessionStore
    };
    return {
        attachTo: function (app) {
            app.use(cookieParser(SECRET));
            app.use(session(sessionOptions));
        },
        authByServer: function (server) {
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