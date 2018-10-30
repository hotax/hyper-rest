const axios = require('axios'),
	qs = require('qs');

module.exports = function(tokenEndpointUri, encodedCredentials, redirectUri) {
	return {
		post: function(code) {
			var form_data = qs.stringify({
				grant_type: 'authorization_code',
				code: code,
				redirect_uri: redirectUri
			});
			var headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: 'Basic ' + encodedCredentials
			};

			return axios
				.post(tokenEndpointUri, form_data, {
					headers: headers
				})
				.then(function(res) {
					return res.data;
				});
		}
	};
};
