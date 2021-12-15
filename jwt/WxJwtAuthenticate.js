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
        throw 'To use WxJwtAuthenticate, you must set env AppSecret, JWT_SECRET, SessionExpiresIn correctly'
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
        authenticate: ({code, username, password}) => {
            let token

            if (!code) {
                return sessionMgr.authenticate(username, password)
                    .then(user =>{
                        if(user){
                            token = jwt.sign({user: user.id}, jwtSecret, defaultSignOptions)
                            return {user, token}
                        }
                        return
                    })
            }

            let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${Appid}&secret=${AppSecret}&js_code=${code}&grant_type=authorization_code`
            return axios.get(url)
                .then(res => {
                    const {openid, session_key, errmsg} = res.data
                    if(errmsg) throw new Error(`Wechat login fail: ${errmsg}`)
                    
                    if(username) {
                        return sessionMgr.authenticate(username, password)
                        .then(user => {
                            if(user){
                                token = jwt.sign({openid, id: user.id}, jwtSecret, defaultSignOptions)
                                return sessionMgr.create({token, openid, userId: user.id, session_key})
                                    .then(()=>{
                                        return {user, token}
                                    })
                            }
                            return
                        })
                    }
                    token = jwt.sign({openid}, jwtSecret, defaultSignOptions)
                    return sessionMgr.create({token, openid, session_key})
                        .then(()=>{
                            return {token}
                        })
                })
        }
    } 
}