const defaultJwt = require('jsonwebtoken'),
    defaultAxios = require('axios'),
    defaultSessionMgr = require('./WxSessions'),
    logger = require('../app/Logger');

const defaultSignOptions = {
    issuer: 'finelets',
    expiresIn: "12h",
    algorithm: "HS256"
}

module.exports = (axios = defaultAxios, jwt = defaultJwt, sessionMgr = defaultSessionMgr) => {
    const Appid = process.env.AppId,
    AppSecret = process.env.AppSecret,
    jwtSecret = process.env.JWT_SECRET,
    expiresIn = process.env.SessionExpiresIn
    if(!Appid || !AppSecret || !jwtSecret) 
        throw 'must set env AppSecret, JWT_SECRET, SessionExpiresIn correctly'
    return {
        getUser: (token)=>{
            let decode
            try {
                decode = jwt.verify(token, jwtSecret, defaultSignOptions)
                return sessionMgr.findByOpenId(decode.openid)
            } catch (err) {
                return sessionMgr.removeToken(token)
            }
        },
        authenticate: (code) => {
            if (!code) {
                logger.error("code is undefined when wechat login")
                return Promise.resolve()
            }
            let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${Appid}&secret=${AppSecret}&js_code=${code}&grant_type=authorization_code`
            let wxInfo, token
            return axios.get(url)
                .then(res => {
                    wxInfo = res.data
                    logger.debug("login to wx by code: " + JSON.stringify(wxInfo, null, 2))
                    token = jwt.sign({openid:wxInfo.openid}, jwtSecret, defaultSignOptions)
                    return sessionMgr.create({...wxInfo})
                        .then(()=>{
                            return {token}
                        })
                })
        }
    } 
}