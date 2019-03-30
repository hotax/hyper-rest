/**
 * Created by clx on 2017/11/24.
 */
const __ = require('underscore');

function createTransGraph(graph, urlParser) {
    function parseUrl(resourceId, destResource, context, req) {
        let destId = destResource
        if (__.isObject(destResource)) {
            if (destResource.condition && !destResource.condition(context, req)) return null;
            destId = destResource.id
        }
        return urlParser(resourceId, destId, context, req)
    }

    function getLinks(resourceId, context, req) {
        const transitions = graph[resourceId]
        const links = []
        __.each(transitions, (val, key) => {
            const href = parseUrl(resourceId, val, context, req)
            if (href) links.push({
                rel: key,
                href
            })
        })
        return links
    }
    return {
        getLinks
    }
}

module.exports = createTransGraph