/**
 * Created by clx on 2017/10/13.
 */
var __resources = {};
var __transGraph;

function createResourceRegistry(createUrlBuilder, restDescriptor) {
    return {
        setTransitionGraph: function (graph) {
            __transGraph = graph;
        },

        getTransitionUrl: function (resourceId, destResourceId, context, req) {
            var resource = __resources[destResourceId];
            return resource.getUrl(resourceId, context, req);
        },

        attach: function (router, resourceId, resourceDesc) {
            if (!resourceDesc.url) throw 'a url must be defined!';
            if (!resourceDesc.rests || resourceDesc.rests.length < 1) throw 'no restful service is defined!';
            let urlBuilder = createUrlBuilder(resourceDesc.url, resourceDesc.transitions)
            var resource = {
                getResourceId: function () {
                    return resourceId;
                },

                getUrl: function (fromResourceId, context, req, key) {
                    return key ? urlBuilder.refUrl(fromResourceId, context, req, key) :
                        urlBuilder.getUrl(fromResourceId, context, req)
                },

                getTransitionUrl: function (destResourceId, context, req, key) {
                    return __resources[destResourceId].getUrl(resourceId, context, req, key);
                },

                getLinks: function (context, req, destResourceId) {
                    const dest = destResourceId ? destResourceId : resourceId
                    const links = __transGraph.getLinks(dest, context, req);
                    return Promise.resolve(links)
                }
            };

            resourceDesc.rests.forEach(function (service) {
                restDescriptor.attach(router, resource, resourceDesc.url, service);
            });

            __resources[resourceId] = resource;
            return resource;
        }
    };
}

module.exports = createResourceRegistry