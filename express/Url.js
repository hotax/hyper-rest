/**
 * Created by clx on 2017/11/14.
 */
const URL = require('url');

module.exports = {
    resolve: function (req, path) {
        var host = req.get('host');
        var hostNameAndPort = host.split(':');
        var baseUrl;
        if(hostNameAndPort.length > 1 && hostNameAndPort[1] === "80"){
            baseUrl = hostNameAndPort[0];
        }else{
            baseUrl = host;
        }
        return URL.resolve(req.protocol + '://' + baseUrl, path);
    }
}