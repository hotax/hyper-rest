/**
 * Created by clx on 2017/10/13.
 */
const Promise = require('bluebird'),
    URL = require('../express/Url'),
    restDescriptor = require('./RestDescriptor'),
    pathToRegexp = require('path-to-regexp');

var __resources = {};
var __transGraph;

module.exports = {
    setTransitionGraph: function (graph) {
        __transGraph = graph;
    },
    getTransitionUrl: function (resourceId, destResourceId, context, req) {
        return __resources[destResourceId].getUrl(resourceId, context, req);
    },
    attach: function (router, resourceId, resourceDesc) {
        if (!resourceDesc.url) throw 'a url must be defined!';
        if (!resourceDesc.rests || resourceDesc.rests.length < 1) throw 'no restful service is defined!';

        var parseUrlPattern = function parseUrlPattern(urlPattern) {
            var pattern = {
                keys: [],
            }
            pathToRegexp(urlPattern, pattern.keys);
            pattern.toPath = pathToRegexp.compile(urlPattern);
            return pattern;
        };
        var urlPattern = parseUrlPattern(resourceDesc.url);
        var resource = {
            getResourceId: function () {
                return resourceId;
            },
            getUrl: function (fromResourceId, context, req) {
                var params = {};
                for (var i = 0; i < urlPattern.keys.length; i++) {
                    var name = urlPattern.keys[i].name;
                    if (context) params[name] = context[name];
                    if (params[name]) continue;
                    if (req && req.params) params[name] = req.params[name];
                    if (params[name]) continue;
                    if (req.query) params[name] = req.query[name];
                }

                if (resourceDesc.transitions && resourceDesc.transitions[fromResourceId]) {
                    var transition = resourceDesc.transitions[fromResourceId];
                    for (var property in transition) {
                        var pair = transition[property].split('.');
                        if (pair[0] === 'context') {
                            params[property] = context[pair[1]];
                        } else {
                            params[property] = req[pair[0]][pair[1]];
                        }
                    }
                }

                var path = urlPattern.toPath(params);
                path = URL.resolve(req, path);

                return path;
            },
            getTransitionUrl: function (destResourceId, context, req) {
                return __resources[destResourceId].getUrl(resourceId, context, req);
            },
            getLinks: function (context, req) {
                return __transGraph.getLinks(resourceId, context, req);
            }
        };

        resourceDesc.rests.forEach(function (service) {
            restDescriptor.attach(router, resource, resourceDesc.url, service);
        });

        __resources[resourceId] = resource;
        return resource;
    }
}

