/**
 * Created by clx on 2017/11/24.
 */
const Promise = require("bluebird");

module.exports = function (graph, urlBuilder) {
    return {
        getLinks: function (resourceId, context, req) {
            return Promise.resolve(graph[resourceId])
                .then(function (trans) {
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