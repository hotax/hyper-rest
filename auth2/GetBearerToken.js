const getBearerTokenFactory = function (parser, checker) {
    return function (req) {
        var inToken = parser(req);
        if(!inToken) return Promise.resolve(null);
        return checker(inToken);
    }
}

module.exports = getBearerTokenFactory;