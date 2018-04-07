var log4js = require('log4js');
var logger = log4js.getLogger();
logger.level = process.env.LOGLEVEL || 'debug';

module.exports = logger;