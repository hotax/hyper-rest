const defaultAuthPath = '/auth',
	defaultTokenPath = '/token',
	defaultErrorTemplate = 'error',
	defaultAuthTemplate = 'approve';

var __config;

const attachToApp = function (app) {
	app.get(defaultAuthPath, function (req, res) {
		return __config
			.checkClient(req.query.client_id, req.query.redirect_uri)
			.then(function (client) {
				var reqId = __config.requestState.saveQuery(req.query);
				res.render(defaultAuthTemplate, {
					reqId: reqId,
					client: client
				});
				return res.end();
			})
			.catch(function (errMsg) {
				res.render(defaultErrorTemplate, {
					error: errMsg
				});
				return res.end();
			});
	});
	app.post(defaultAuthPath, function (req, res) {
		var query = __config.requestState.getQuery(req.body.reqid);
		if (!query) {
			res.render(defaultErrorTemplate, {
				error: 'No matching authorization request'
			});
			return res.end();
		}
		var urlParsed;
		if (!req.body.approve) {
			urlParsed = __config.buildUri(query.redirect_uri, {
				error: 'access_denied'
			});
			res.redirect(urlParsed);
			return res.end();
		}
		return __config.authCode.generate(query).then(function (code) {
			urlParsed = __config.buildUri(query.redirect_uri, {
				code: code,
				state: query.state
			});
			res.redirect(urlParsed);
			return res.end();
		});
	});
	app.post(defaultTokenPath, function (req, res) {
		return __config.authenticateClient(req)
			.then(function (clientId) {
				var errMsg = 'unsupported grant type';
				if (req.body.grant_type == 'authorization_code') {
					return __config.checkAuthCode(req.body.code, clientId)
						.then(function () {
							return __config.issueAccessToken(clientId);
						})
						.then(function (accessToken) {
							return res.status(200).json({
								access_token: accessToken,
								token_type: 'Bearer'
							});
						})
						.catch(function (errMsg) {
							return res.status(400).json({
								error: errMsg
							});
						})
				}
				return res.status(400).json({
					error: 'unsupported grant type'
				});
			})
			.catch(function (errMsg) {
				return res.status(401).json({
					error: errMsg
				});
			});
	});
};
const createAuthServer = function (config) {
	__config = config;
	return {
		attachTo: attachToApp
	};
};

module.exports = createAuthServer;