/**
 * Created by clx on 2017/10/13.
 */
const MEDIA_TYPE = 'application/vnd.finelets.com+json',
    REASON_FORBIDDEN = "forbidden",
    REASON_IF_MATCH = 'if-match',
    REASON_NOTHING = 'nothing',
    REASON_CONCURRENT_CONFLICT = 'concurrent-conflict',
    REASON_NOT_FOUND = 'not-found';

const __ = require('underscore'),
    moment = require('moment'),
    logger = require('../app/Logger');

let __urlResolve, __cacheControl

const __sendRes = (res, state, data) => {
    res.status(state)
    if (data) res.send(data)
    res.end()
}

const __attachHandler = function (router, method, context, urlPattern, restDesc) {
    return router[method](urlPattern, function (req, res) {
        return handlerMap[restDesc.type].handler(context, restDesc, req, res);
    });
};
const __getHandler = function (context, restDesc, req, res) {
    var query = Object.assign({}, req.query);
    var representation;
    return restDesc.handler(query)
        .then(function (data) {
            var self = __urlResolve(req, req.originalUrl);
            representation = {
                data: data,
                self: self
            };
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

const __readHandler = function (context, restDesc, req, res) {
    return __doHandle()
        .catch(err => {
            if (__.isError(err)) err = 500
            return __sendRes(res, err)
        })

    function __doHandle() {
        if (!restDesc.handler || !__.isFunction(restDesc.handler))
            return __sendRes(res, 501)

        const id = req.params,
            version = req.get('If-None-Match'),
            updatedAt = req.get('If-Modified-Since')
        if (__needValidation(restDesc.ifNoneMatch, version)) {
            return __doValidation(restDesc.ifNoneMatch, id, version)
        }
        if (__needValidation(restDesc.ifModifiedSince, updatedAt)) {
            return __doValidation(restDesc.ifModifiedSince, id, updatedAt)
        }
        return __doHandlerHandle(id)
    }

    function __needValidation(validation, version) {
        return version && validation && __.isFunction(validation)
    }

    function __doValidation(validation, id, version) {
        return validation(id, version)
            .then((changed) => {
                if (!changed) {
                    return __sendRes(res, 304)
                }
                return __doHandlerHandle(id)
            })
    }

    function __doHandlerHandle(id) {
        return restDesc.handler(id)
            .then((data) => {
                if (__.isUndefined(data)) return __sendRes(res, 404)
                return __doResponse(data)
            })
    }

    function __doResponse(data) {
        const href = __urlResolve(req, req.originalUrl);
        let representation = {
            href
        };
        representation[context.getResourceId()] = data;
        if (!__.isUndefined(data.__v)) {
            res.set('ETag', data.__v)
        }
        if (data.updatedAt) res.set('Last-Modified', data.updatedAt);
        if (restDesc.cache) {
            let ctrl = __cacheControl(restDesc.cache)
            res.set('Cache-Control', ctrl)
        }
        return context.getLinks(data, req)
            .then(function (links) {
                representation.links = links;
                res.set('Content-Type', MEDIA_TYPE);
                return res.status(200).json(representation);
            })
    }
};

const __queryHandler = function (context, restDesc, req, res) {
    var query = Object.assign({}, req.query);
    if (query.perpage) query.perpage = parseInt(query.perpage);
    if (query.page) query.page = parseInt(query.page);
    var representation;
    return restDesc.handler(query)
        .then(function (data) {
            var self = __urlResolve(req, req.originalUrl);
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

                // TODO: 暂时保留id用于查询时可作为查询条件取值，以后应通过URL提供查询条件取值，例如查询指定料品的订单或采购单等
                // delete copy['id']
                var item = {
                    link: {
                        rel: restDesc.element,
                        href: href
                    },
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
    return __doHandle()
        .catch(err => {
            if (__.isError(err)) err = 500
            return __sendRes(res, err)
        })

    function __doHandle() {
        if (!restDesc.handler || !__.isFunction(restDesc.handler))
            return __sendRes(res, 501)

        let id = req.params
        return restDesc.handler(id)
            .then((data) => {
                if (__.isUndefined(data)) return __sendRes(res, 404)
                const code = data ? 204 : 405
                return __sendRes(res, code)
            })
    }
};

const __updateHandler = (context, restDesc, req, res) => {
    return __doHandle()
        .catch(err => {
            if (__.isError(err)) err = 500
            return __sendRes(res, err)
        })

    function __doHandle() {
        if (!restDesc.handler || !restDesc.handler.handle || !__.isFunction(restDesc.handler.handle))
            return Promise.reject(501)
        let {
            conditional
        } = restDesc
        if (__.isUndefined(conditional)) conditional = true
        let id = req.params["id"]
        return conditional ? __conditionalHandle(id) : __handle(id)
    }

    function __conditionalHandle(id) {
        if (!restDesc.handler.ifMatch && !restDesc.handler.ifUnmodifiedSince) return Promise.reject(501)
        return restDesc.handler.ifMatch ? __ifMatch(id) : __ifUnmodifiedSince(id)
    }

    function __ifMatch(id) {
        if (!__.isFunction(restDesc.handler.ifMatch)) return Promise.reject(501)
        let version = req.get('If-Match')
        if (!version) return Promise.reject(428)

        return __checkAndHandle(restDesc.handler.ifMatch, id, version)
    }

    function __ifUnmodifiedSince(id) {
        if (!__.isFunction(restDesc.handler.ifUnmodifiedSince)) return Promise.reject(501)
        let version = req.get('If-Unmodified-Since')
        if (!version) return Promise.reject(428)

        return __checkAndHandle(restDesc.handler.ifUnmodifiedSince, id, version)
    }

    function __checkAndHandle(check, id, version) {
        return check(id, version)
            .then(valid => {
                if (!valid) return Promise.reject(412)
                return __handle(id)
            })
    }

    function __handle(id) {
        return restDesc.handler.handle(id, req.body)
            .then(data => {
                if (!data) return Promise.reject(409)

                const self = __urlResolve(req, req.originalUrl)
                res.set('Content-Location', self)
                return __sendRes(res, 204)
            })
    }
}

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
            let representation = {
                href: urlToCreatedResource
            };
            representation[restDesc.target] = targetObject;
            if (links.length > 0) representation.links = links;
            return res.status(201).json(representation);
        })
        .catch(function () {
            return __sendRes(res, 500)
        })
}

const __entryHandler = function (context, restDesc, req, res) {
    return context.getLinks(null, req)
        .then(function (links) {
            res.set('Content-Type', MEDIA_TYPE);
            return res.status(200).json({
                links: links
            });
        })
        .catch(function (err) {
            return res.status(500).send(err);
        })
};

const __uploadHandler = (context, restDesc, req, res) => {
    req.pipe(req.busboy)
    req.busboy.on('file', (fieldname, file, filename) => {
        logger.debug('Uploading: ' + filename)
        let writable = restDesc.handler()
        writable.on('finish', () => {
            return context.getLinks(null, req)
                .then(function (links) {
                    res.set('Content-Type', MEDIA_TYPE);
                    return res.status(200).json({
                        links: links
                    });
                })
                .catch(() => {
                    return res.status(500).end()
                })
        })
        file.pipe(writable)
    })
}

const handlerMap = {
    entry: {
        method: "get",
        handler: __entryHandler
    },
    get: {
        method: "get",
        handler: __getHandler
    },
    create: {
        method: "post",
        handler: __createHandler
    },
    update: {
        method: "put",
        handler: __updateHandler
    },
    delete: {
        method: "delete",
        handler: __deleteHandler
    },
    query: {
        method: "get",
        handler: __queryHandler
    },
    read: {
        method: "get",
        handler: __readHandler
    },
    upload: {
        method: "post",
        handler: __uploadHandler
    }
}

function __create(urlResolve, cacheControlParser) {
    __urlResolve = urlResolve
    __cacheControl = cacheControlParser

    return {
        attach: function (router, currentResource, urlPattern, restDesc) {
            var type = restDesc.type.toLowerCase();
            return __attachHandler(router, handlerMap[type].method, currentResource, urlPattern, restDesc);
        }
    }
}
module.exports = __create