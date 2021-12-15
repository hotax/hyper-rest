module.exports = {
    ExpressJwt: require('./ExpressJwt'),
    WechatJwt: require('./WechatJwt'),
    WxJwtAuthenticate: (userMgr) => {
        return require('./WxJwtAuthenticate')(userMgr)
    }
}