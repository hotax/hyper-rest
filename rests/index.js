const URL = require('../express/Url').resolve,
    cacheControlParser = require('./CacheControlParser'),
    createUrlBuilder = require('./UrlBuilder')(URL),
    resourceDescriptorsLoader = require('./DirectoryResourceDescriptorsLoader'),
    restDescriptor = require('./RestDescriptor')(URL, cacheControlParser),
    resourceRegistry = require('./ResourceRegistry')(createUrlBuilder, restDescriptor),
	BaseTransitionGraph = require('./BaseTransitionGraph');


module.exports = (restDir, graph) => {
    let resourceDescriptors = resourceDescriptorsLoader(restDir).loadAll()
    let transitionsGraph = BaseTransitionGraph(graph, 
        (resourceId, resource, context, req) => { 
            return resourceRegistry.getTransitionUrl(resourceId, resource, context, req)
        });
    resourceRegistry.setTransitionGraph(transitionsGraph);
    return [resourceRegistry, resourceDescriptors]
}