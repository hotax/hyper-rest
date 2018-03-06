const cluster = require('cluster'),
    os = require('os');

var log4js = require('log4js');
var logger = log4js.getLogger();

module.exports = {
    boot: function (app) {
        if(process.env.DEVELOPMENT){
            app();
            return;
        }

        if (cluster.isMaster) {
            var cpus = os.cpus().length;
            for (var i = 0; i < cpus; i++) {
                cluster.fork();
                cluster.on('exit', function (worker, code) {
                    if (code != 0 && !worker.suicide) {
                        logger.info('Worker crashed. ~~~~~~~~~~~~~~~~~~~~~~~~~');
                        /*logger.info('Worker crashed. Starting a new worker ~~~~~~~~~~~~~~~~~~~~~~~~~');
                         cluster.fork();*/
                    }
                });
            }
        }
        else {
            app();
        }
    },
    express: {
        appBuilder: require('./express/AppBuilder')
    }
}