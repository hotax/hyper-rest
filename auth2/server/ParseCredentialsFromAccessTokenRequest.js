const parseCredentialsFromAccessTokenRequest = function(decodeCredentials){
    return function(req){
        var auth = req.headers['authorization'];
        if (auth) {
            var encoded = auth.slice('basic '.length);
            return decodeCredentials(encoded);
        }
        if (req.body.client_id) {
            return {
                id: req.body.client_id,
                secret: req.body.client_secret
            }
        }
    }
}

module.exports = parseCredentialsFromAccessTokenRequest;