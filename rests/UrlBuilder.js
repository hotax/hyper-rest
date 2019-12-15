const pathToRegexpObj = require('path-to-regexp'),
    ctxUrlRefParserBuilderFactory = require('./CtxUrlRefParser'),
    __ = require('underscore')

let __urlResolver

function parseUrlPattern(urlPattern) {
    let pattern = {
        keys: []
    };
    pathToRegexpObj.pathToRegexp(urlPattern, pattern.keys)
    const toPath = pathToRegexpObj.compile(urlPattern)
    pattern.toPath = (req, params) => {
        const path = toPath(params)
        return __urlResolver(req, path)
    }
    return pattern;
}

class UrlBuilder {
    constructor(urlTemplete, resourceUrlParamMap) {
        const urlPattern = parseUrlPattern(urlTemplete)
        this.__urlPattern = urlPattern
        this.__ctxUrlRefParserBuilder = ctxUrlRefParserBuilderFactory(urlPattern.toPath)
        this.__map = resourceUrlParamMap
    }

    getUrl(resourceId, context, req, theCtxkey) {
        function __gatherUrlPrarms(){

        }
        
        const keys = this.__urlPattern.keys
        // const map = this.__map ? this.__map[resourceId] :
        let params = {}
        for (let i = 0; i < keys.length; i++) {
            let name = keys[i].name;
            if (context) params[name] = context[name];
            if (params[name]) continue;
            if (req && req.params) params[name] = req.params[name];
            if (params[name]) continue;
            if (req.query) params[name] = req.query[name];
        }

        let map = this.__map
        if (map) {
            map = map[resourceId]
            if (map) {
                __.each(map, (val, key) => {
                    let pair = val.split('.');
                    if (pair[0] === 'context') {
                        params[key] = theCtxkey ? context[theCtxkey] : context[pair[1]];
                    } else {
                        params[key] = req[pair[0]][pair[1]];
                    }
                })
            }
        }
        return this.__urlPattern.toPath(req, params)
    }

    refUrl(resourceId, context, req, ctxRefs) {
        const urlPattern = this.__urlPattern,
            keys = urlPattern.keys
        const params = {}
        let refKey

        for (let i = 0; i < keys.length; i++) {
            let name = keys[i].name;
            if (context) params[name] = context[name];
            if (params[name]) continue;
            if (req && req.params) params[name] = req.params[name];
            if (params[name]) continue;
            if (req.query) params[name] = req.query[name];
        }

        let map = this.__map
        if (map) {
            map = map[resourceId]
            if (map) {
                __.each(map, (val, key) => {
                    let sections = val.split('.')
                    if (sections.length === 1 && sections[0] === 'context') {
                        refKey = key
                    } else {
                        params[key] = sections[0] === 'context' ? context[sections[1]] :
                            req[sections[0]][sections[1]]
                    }
                })
            }
        }
        const refUrlParser = this.__ctxUrlRefParserBuilder(req, refKey, params)
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