/**
 * Created by clx on 2017/10/13.
 */
const MEDIA_TYPE = 'application/vnd.hotex.com+json',
    REASON_FORBIDDEN = "forbidden",
    REASON_IF_MATCH = 'if-match',
    REASON_NOTHING = 'nothing',
    REASON_CONCURRENT_CONFLICT = 'concurrent-conflict',
    REASON_NOT_FOUND = 'not-found';

const URL = require('../express/Url');

const __attachHandler = function (router, method, context, urlPattern, restDesc) {
    return router[method](urlPattern, function (req, res) {
        return handlerMap[restDesc.type].handler(context, restDesc, req, res);
    });
};

const __readHandler = function (context, restDesc, req, res) {
    var representation;
    return restDesc.handler(req, res)
        .then(function (data) {
            var self = URL.resolve(req, req.originalUrl);
            representation = {
                href: self
            };
            representation[context.getResourceId()] = data;
            res.set('ETag', data.__v);
            if (data.modifiedDate) res.set('Last-Modified', data.modifiedDate);
            return context.getLinks(data, req);
        })
        .then(function (links) {
            representation.links = links;
            res.set('Content-Type', MEDIA_TYPE);
            return res.status(200).json(representation);
        })
        .catch(function (err) {
            if(err.toLowerCase() === REASON_NOT_FOUND)
                return res.status(404).end();
            console.error(err);
            return res.status(500).send(err);
        })
};
const __queryHandler = function (context, restDesc, req, res) {
    var query = Object.assign({}, req.query);
    if (query.perpage) query.perpage = parseInt(query.perpage);
    if (query.page) query.page = parseInt(query.page);
    var representation;
    return restDesc.handler(query)
        .then(function (data) {
            var self = URL.resolve(req, req.originalUrl);
            representation = {
                collection: {
                    href: self,
                    perpage: data.perpage,
                    page: data.page,
                    total: data.total
                }
            };
            representation.collection.items = [];
            data.items.forEach(function (itemData) {
                var href = context.getTransitionUrl(restDesc.element, itemData, req);
                var copy = Object.assign({}, itemData);
                delete copy['id'];
                var item = {
                    link: {rel: restDesc.element, href: href},
                    data: copy
                };
                representation.collection.items.push(item);
            });
            return context.getLinks(data, req);
        })
        .then(function (links) {
            representation.links = links;
            res.set('Content-Type', MEDIA_TYPE);
            return res.status(200).json(representation);
        })
        .catch(function (err) {
            console.error(err);
            return res.status(500).send(err);
        })
};
const __deleteHandler = function (context, restDesc, req, res) {
    var id = req.params["id"];
    var etag = req.get("If-Match");
    var aPromis = etag ? restDesc.handler.condition(id, etag)
        : !restDesc.conditional ? Promise.resolve(true) : Promise.reject("Forbidden");
    return aPromis
        .then(function (data) {
            if (!data) return Promise.reject(REASON_IF_MATCH);
            return restDesc.handler.handle(id, etag);
        })
        .then(function () {
            return res.status(204).end();
        })
        .catch(function (reason) {
            if (reason.toLowerCase() === REASON_FORBIDDEN)
                return res.status(403).send("client must send a conditional request").end();
            if (reason.toLowerCase() === REASON_IF_MATCH)
                return res.status(412).end();
            if (reason.toLowerCase() === REASON_NOT_FOUND)
                return res.status(404).end();
            if (reason.toLowerCase() === REASON_CONCURRENT_CONFLICT)
                return res.status(304).end();
            if (restDesc.response && restDesc.response[reason]) {
                var msg = restDesc.response[reason].err ? restDesc.response[reason].err : reason;
                return res.status(restDesc.response[reason].code)
                    .send(msg)
                    .end();
            }
            console.error(reason);
            return res.status(500).send(reason);
        })
};
const __updateHandler = function (context, restDesc, req, res) {
    var id = req.params["id"];
    var etag = req.get("If-Match");
    var aPromis = etag ? restDesc.handler.condition(id, etag)
        : !restDesc.conditional ? Promise.resolve(true) : Promise.reject("Forbidden");
    return aPromis
        .then(function (data) {
            if (!data) return Promise.reject(REASON_IF_MATCH);
            var body = req.body;
            return restDesc.handler.handle(id, body);
        })
        .then(function (data) {
            if (!data || !data.__v && !data.modifiedDate) {
                return Promise.reject("handler did not promise any state version info ....");
            }
            if (data.__v) res.set('ETag', data.__v);
            if (data.modifiedDate) res.set('Last-Modified', data.modifiedDate.toJSON());
            return res.status(204).end();
        })
        .catch(function (reason) {
            //TODO:需要处理reason不是String类型的情况，如mongoose error：当ID多一位数字，如5a110479d1036d4dd0dc4aed1就是一个非法ID
            if (reason.toLowerCase() === REASON_FORBIDDEN)
                return res.status(403).send("client must send a conditional request").end();
            if (reason.toLowerCase() === REASON_IF_MATCH)
                return res.status(412).end();
            if (reason.toLowerCase() === REASON_NOT_FOUND)
                return res.status(404).end();//Concurrent-Conflict
            if (reason.toLowerCase() === REASON_CONCURRENT_CONFLICT)
                return res.status(304).end();
            if (reason.toLowerCase() === REASON_NOTHING)
                return res.status(204).end();
            if (restDesc.response && restDesc.response[reason])
                return res.status(restDesc.response[reason].code)
                    .send(restDesc.response[reason].err)
                    .end();
            console.error(reason);
            return res.status(500).send(reason);
        })
};
const __createHandler = function (context, restDesc, req, res) {
    var urlToCreatedResource, targetObject;
    return restDesc.handler(req.body)
        .then(function (data) {
            targetObject = data;
            urlToCreatedResource = context.getTransitionUrl(restDesc.target, data, req);
            return context.getLinks(data, req);
        })
        .then(function (links) {
            res.set('Content-Type', MEDIA_TYPE);
            res.set('Location', urlToCreatedResource);
            var representation = {
                href: urlToCreatedResource
            };
            representation[restDesc.target] = targetObject;
            if (links.length > 0) representation.links = links;
            return res.status(201).json(representation);
        })
        .catch(function (err) {
            console.error(err);
            return res.status(500).send(err);
        })
};
const __entryHandler = function (context, restDesc, req, res) {
    return context.getLinks(null, req)
        .then(function (links) {
            res.set('Content-Type', MEDIA_TYPE);
            return res.status(200).json({
                links: links
            });
        })
        .catch(function (err) {
            console.error(err);
            return res.status(500).send(err);
        })
};

const handlerMap = {
    entry: {method: "get", handler: __entryHandler},
    create: {method: "post", handler: __createHandler},
    update: {method: "put", handler: __updateHandler},
    delete: {method: "delete", handler: __deleteHandler},
    query: {method: "get", handler: __queryHandler},
    read: {method: "get", handler: __readHandler}
};

module.exports = {
    attach: function (router, currentResource, urlPattern, restDesc) {
        var type = restDesc.type.toLowerCase();
        return __attachHandler(router, handlerMap[type].method, currentResource, urlPattern, restDesc);
    }
}

