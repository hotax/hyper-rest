/**
 * Created by clx on 2017/10/9.
 */
const path = require('path'),
    morgan = require('morgan'),
    favicon = require('serve-favicon'),
    bodyParser = require('body-parser'),
    xmlBodyParser = require('express-xml-bodyparser'),
    express = require('express'),
    app = express();

const initappobject = function() {
    app.use(morgan('dev')); // used as logger
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(xmlBodyParser({
        explicitArray: false,
        normalize: false,
        normalizeTags: false,
        trim: true
    }));

    app.set('views', defaultViewsPath);
    app.set('trust proxy', 'loopback'); // 参考： Express behind proxies
};

module.exports.begin = function (base) {
    var __resourceRegistry;
    var viewEngine;

    initappobject();
    var appBuilder = {
        getApp: function () {
            return app;
        },
        setWebRoot: function (root, dir) {
            app.use(root, express.static(path.join(base, dir)));
            return appBuilder;
        },
        setFavicon: function (faviconPathName) {
            app.use(favicon(path.join(base, faviconPathName)));
            return appBuilder;
        },
        setViewEngine: function (engine) {
            viewEngine = engine;
            return appBuilder;
        },
        setSessionStore: function (store) {
            store.attachTo(app);
            return appBuilder;
        },
        setResources: function (resourceRegistry, resources) {
            __resourceRegistry = {
                attachTo: function (router) {
                    for (var id in resources)
                        resourceRegistry.attach(router, id, resources[id]);
                }
            };
            return appBuilder;
        },
        useMiddleware: function (uri, middleware) {
            app.use(uri, middleware);
            return appBuilder;
        },
        setRoutes: function (routes) {
            routes.attachTo(app);
            return appBuilder;
        },
        end: function () {
            if (viewEngine) viewEngine.attachTo(app);
            if (__resourceRegistry) __resourceRegistry.attachTo(app);
            return appBuilder;
        },
        run: function (callback) {
            var port = process.env.PORT || 80;
            return app.listen(port, callback);
        }
    };
    return appBuilder;
};