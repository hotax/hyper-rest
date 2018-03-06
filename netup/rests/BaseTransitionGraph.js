/**
 * Created by clx on 2017/11/24.
 */
const Promise = require("bluebird");
var __urlBuilder;
var __graph;

module.exports = function (graph, urlBuilder) {
    __graph = graph;
    __urlBuilder = urlBuilder;
    return {
        getLinks: function (resourceId, context, req) {
            return Promise.resolve(__graph[resourceId])
                .then(function (trans) {
                    var links = [];
                    for (var key in trans) {
                        var resource = trans[key];
                        if (typeof resource === "object") {
                            if (!resource.condition(context, req)) continue;
                            resource = resource.id;
                        }
                        var href = __urlBuilder.getTransitionUrl(resourceId, resource, context, req);
                        links.push({rel: key, href: href});
                    }
                    return links;
                })
        }
    }
}
