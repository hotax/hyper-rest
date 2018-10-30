const querystring = require('querystring');

const encodeCredentials = function (clientId, clientSecret) {
    return new Buffer(querystring.escape(clientId) + ':' + querystring.escape(clientSecret)).toString('base64');
};

module.exports = encodeCredentials;