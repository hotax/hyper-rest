const connectDb = require('../db/mongoDb/ConnectMongoDb'),
	appBuilderFactory = require('./AppBuilder'),
	logger = require('../app/Logger'),
	messageCenter = require('../mq'),
	jwt = require('../jwt/ExpressJwt'),
	cors = require('cors'),
	path = require('path'),
	https = require('https'),
	http = require('http'),
	restsBuilder = require('../rests');

const createServer = async ({
	appName,
	baseDir,
	cert,
	messageCenterConfig,
	jwtConfig,
	flow
}) => {
	const appBuilder = appBuilderFactory.begin(baseDir),
		restDir = path.join(baseDir, './server/rests'),
		clientDir = './client',
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
			.setJwt(jwt, {...jwtConfig, appName})
			.setResources(...rests)
			.end();
	}

	await connectDb(function () {
		logger.info('db: ' + process.env.MONGODB);
		logger.info('connect mongodb success .......');
		return messageCenter.start(messageCenterConfig)
			.then(() => {
				const defaultPort = 19001   // Non-privileged user (not root) can't open a listening socket on ports below 1024
				var port = process.env.PORT || defaultPort;
				const server = cert ? https.createServer(cert, app) : http.createServer(app)
				return server.listen(port, () => {
					const addr = server.address();
					logger.info('the server is running and listening at ' + addr.port);
				})
			})
	})
}

module.exports = createServer