const url = require('url')
__ = require('underscore');

const __urlBuilder = function (base, options) {
    var newUrl = url.parse(base, true);
    if (!newUrl.query) {
        newUrl.query = {};
    }
    __.each(options, function (value, key) {
        newUrl.query[key] = value;
    });

    return url.format(newUrl);
}

const authorizationRequestUrlBuilder = function(authorizationEndpointUrl, clientId, redirectUri, state) {
    return __urlBuilder(authorizationEndpointUrl, {
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state
    });
}


module.exports = authorizationRequestUrlBuilder;