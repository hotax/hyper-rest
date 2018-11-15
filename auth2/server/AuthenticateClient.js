const Promise = require('bluebird');

const authenticateClient = function (parseCredentials, authenticate) {
    return function (req) {
        var credentials = parseCredentials(req);
        if (!credentials) return Promise.reject('Invalid client');
        return authenticate(credentials.id, credentials.secret)
        .then(function(passed){
            return passed ? credentials.id : Promise.reject('Invalid client');
        })
    }
}
module.exports = authenticateClient;