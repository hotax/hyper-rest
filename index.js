const cluster = require('cluster'),
    os = require('os');

var log4js = require('log4js');
var logger = log4js.getLogger();

module.exports = {
    express: {
        appBuilder: require('./express/AppBuilder'),
        handlebarsFactory: require('./express/HandlebarsFactory')
    },
    rests: {
        directoryResourceDescriptorsLoader: require('./rests/DirectoryResourceDescriptorsLoader'),
        resourceRegistry: require('./rests/ResourceRegistry'),
        baseTransitionGraph: require('./rests/BaseTransitionGraph')
    },
    db: {
        mongoDb: {
            connectMongoDb: require('./db/mongoDb/ConnectMongoDb'),
            save: require('./db/mongoDb/SaveObjectToDb')
        }
    },
    session:{
        mongoDb: require('./session/MongoDbSessionStore')
    }
}