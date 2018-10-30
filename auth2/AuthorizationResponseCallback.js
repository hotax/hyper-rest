const attachTo = function (app, url, options) {
	app.get(url, function (req, res) {
		if (!req.query.code) {
			options.createHttpError.BadRequest(res, '请求中未包含query.code参数');
			return res.end();
		}
		if (!options.clientState.check(req.query.state)) {
			options.createHttpError.BadRequest(res, '请求中State值不匹配');
			return res.end();
		}
		return options.authCodeGrantRequestSender.post(req.query.code).then(function (token) {
			// TODO: save token
			return res.end();
		});
	});
};

module.exports = attachTo
