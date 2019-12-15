const pathToRegexpObj = require('path-to-regexp'),
    ctxUrlRefParserBuilderFactory = require('./CtxUrlRefParser'),
    createMapContextToUrlParams = require('./MapContextToUrlParams'),
    __ = require('underscore')

let __urlResolver

function parseUrlPattern(urlPattern) {
    const keys = []
    pathToRegexpObj.pathToRegexp(urlPattern, keys)
    const toPath = pathToRegexpObj.compile(urlPattern)
    const pattern = {
        toPath: (req, params) => {
            const path = toPath(params)
            return __urlResolver(req, path)
        },
        getUrlParamsByKeys: (req, context) => {
            const params = {}
            for (let i = 0; i < keys.length; i++) {
                let name = keys[i].name;
                if (context) params[name] = context[name];
                if (params[name]) continue;
                if (req && req.params) params[name] = req.params[name];
                if (params[name]) continue;
                if (req.query) params[name] = req.query[name];
            }
            return params
        }
    }
    return pattern;
}

class UrlBuilder {
    constructor(urlTemplete, resourceUrlParamMap) {
        const urlPattern = parseUrlPattern(urlTemplete)
        this.__urlPattern = urlPattern
        this.__ctxUrlRefParserBuilder = ctxUrlRefParserBuilderFactory(urlPattern.toPath)
        this.__map = createMapContextToUrlParams(resourceUrlParamMap)
    }

    getUrl(resourceId, context, req) {
        let params = this.__urlPattern.getUrlParamsByKeys(req, context)
        const map = this.__map.toParams(resourceId, req, context)
        params = {
            ...params,
            ...map
        }
        return this.__urlPattern.toPath(req, params)
    }

    refUrl(resourceId, context, req, ctxRefs) {
        let map = this.__map
        const refKey = map.getRefKey(resourceId)
        const refUrlParser = this.__ctxUrlRefParserBuilder(req, refKey)
        refUrlParser.refUrl(context, ctxRefs)
    }
}

function createUrlBuilder(urlTemplete, resourceUrlParamMap) {
    return new UrlBuilder(urlTemplete, resourceUrlParamMap)
}

module.exports = (urlResolver) => {
    __urlResolver = (req, path) => {
        // TODO: 考虑是否一定需要完整的URL 
        return urlResolver ? urlResolver(req, path) : path
    }
    return createUrlBuilder
}