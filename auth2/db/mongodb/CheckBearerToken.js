const tokenSchema = require('./TokenSchema');

const checkBearerToken = function(bearerToken){
    return tokenSchema.findOne({
        accessToken: bearerToken
    })
    .then(function(data){
        return data ? data.toObject() : data;
    })
}
module.exports = checkBearerToken;