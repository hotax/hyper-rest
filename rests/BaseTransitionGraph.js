/**
 * Created by clx on 2017/11/24.
 */
const Promise = require("bluebird"),
    logger = require('../app/Logger');

module.exports = function (graph, urlBuilder) {
    return {
        getLinks: function (resourceId, context, req) {
            logger.debug('begin to getLinks from graph!');
            return Promise.resolve(graph[resourceId])
                .then(function (trans) {
                    logger.debug('we have got some trans from graph!');
                    var links = [];
                    for (var key in trans) {
                        var resource = trans[key];
                        if (typeof resource === "object") {
                            if (!resource.condition(context, req)) continue;
                            resource = resource.id;
                        }
                        var href = urlBuilder.getTransitionUrl(resourceId, resource, context, req);
                        links.push({
                            rel: key,
                            href: href
                        });
                    }
                    return links;
                })
        }
    }
}