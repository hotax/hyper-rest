module.exports = function (getAccessToken) {
    const authHandler = function (req, res, next) {
        return getAccessToken(req)
            .then(function (token) {
                if (!token) {
                    return res.status(401).end();
                }
                req.access_token = token;
                return next();
            })
    }
    var obj = {
        all: function (app, path) {
            app.all(path + '*', authHandler);
        },
        get: function (app, url, handler) {
            app.get(url, authHandler, handler);
        },
        post: function (app, url, handler) {
            app.post(url, authHandler, handler);
        },
        put: function (app, url, handler) {
            app.put(url, authHandler, handler);
        },
        delete: function (app, url, handler) {
            app.delete(url, authHandler, handler);
        }
    }
    return obj;
}