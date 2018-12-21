const resourceDescriptorsLoader = require('./DirectoryResourceDescriptorsLoader'),
	resourceRegistry = require('./ResourceRegistry'),
	BaseTransitionGraph = require('./BaseTransitionGraph');


module.exports = (restDir, graph) => {
    let resourceDescriptors = resourceDescriptorsLoader(restDir).loadAll()
    let transitionsGraph = BaseTransitionGraph(graph, resourceRegistry);
    resourceRegistry.setTransitionGraph(transitionsGraph);
    return [resourceRegistry, resourceDescriptors]
}