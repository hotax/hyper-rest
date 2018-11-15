const querystring = require('querystring');

const encodeCredentials = function (clientId, clientSecret) {
    return new Buffer(querystring.escape(clientId) + ':' + querystring.escape(clientSecret)).toString('base64');
};

module.exports = {
    encode: encodeCredentials,
    decode: function (encoded) {
        var clientCredentials = new Buffer(encoded, 'base64').toString().split(':');
        var clientId = querystring.unescape(clientCredentials[0]);
        var clientSecret = querystring.unescape(clientCredentials[1]);
        return {
            id: clientId,
            secret: clientSecret
        };
    }
}