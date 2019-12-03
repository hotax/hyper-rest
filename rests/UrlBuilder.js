const pathToRegexp = require('path-to-regexp'),
    __ = require('underscore')

let __urlResolver

function parseUrlPattern(urlPattern) {
    let pattern = {
        keys: []
    };
    pathToRegexp(urlPattern, pattern.keys);
    pattern.toPath = pathToRegexp.compile(urlPattern);
    return pattern;
}

class UrlBuilder {
    constructor(urlTemplete, resourceUrlParamMap) {
        this.__urlPattern = parseUrlPattern(urlTemplete)
        this.__map = resourceUrlParamMap
    }

    getUrl(resourceId, context, req, theCtxkey) {
        const keys = this.__urlPattern.keys
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
        let path = this.__urlPattern.toPath(params);
        // TODO: 考虑是否一定需要完整的URL 
        return __urlResolver ? __urlResolver(req, path) : path
    }
}

function createUrlBuilder(urlTemplete, resourceUrlParamMap) {
    return new UrlBuilder(urlTemplete, resourceUrlParamMap)
}

module.exports = (urlResolver) => {
    __urlResolver = urlResolver
    return createUrlBuilder
}