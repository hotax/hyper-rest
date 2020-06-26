const connectDb = require('@finelets/hyper-rest/db/mongoDb/ConnectMongoDb'),
	appBuilderFactory = require('@finelets/hyper-rest/express/AppBuilder'),
	logger = require('@finelets/hyper-rest/app/Logger'),
	messageCenter = require('@finelets/hyper-rest/mq'),
	jwt = require('@finelets/hyper-rest/jwt/ExpressJwt'),
	cors = require('cors'),
	path = require('path'),
	restsBuilder = require('@finelets/hyper-rest/rests');

const createServer = ({
	appName,
	baseDir,
	messageCenterConfig,
	jwtConfig,
	flow
}) => {
	const appBuilder = appBuilderFactory.begin(baseDir),
		restDir = path.join(baseDir, './server/rests'),
		clientDir = path.join(baseDir, './client'),
		favicon = 'client/imgs/favicon.jpg',
		webRoot = `/${appName}/root`,
		rests = restsBuilder(restDir, flow);

	var app = appBuilder.getApp();

	let mode = process.env.RUNNING_MODE
	logger.info('Server is running at ' + mode + ' mode')
	if (mode === 'rest') {
		appBuilder
			.setWebRoot(webRoot, clientDir)
			.setFavicon(favicon)
			.setResources(...rests)
			.end();
	} else {
		app.use(cors())
		appBuilder
			.setWebRoot(webRoot, clientDir)
			.setFavicon(favicon)
			.setJwt(jwt, jwtConfig)
			.setResources(...rests)
			.end();
	}

	connectDb(function () {
		logger.info('db: ' + process.env.MONGODB);
		logger.info('connect mongodb success .......');
		return messageCenter.start(messageCenterConfig)
			.then(() => {
				var server = appBuilder.run(function () {
					const addr = server.address();
					logger.info('the server is running and listening at ' + addr.port);
				});
			})
	})
}

module.exports = createServer