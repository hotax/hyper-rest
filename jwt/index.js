const defualtUserMgr = require('../usermgr/Users')

module.exports = {
    ExpressJwt: require('./ExpressJwt'),
    WechatJwt: require('./WechatJwt'),
    WxJwtAuthenticate: (userMgr = defualtUserMgr) => {
        return require('./WxJwtAuthenticate')(userMgr)
    }
}