const defaultJwt = require('jsonwebtoken'),
    defaultAxios = require('axios'),
    defaultSessionMgr = require('./WxSessions'),
    logger = require('../app/Logger');

const defaultSignOptions = {
    issuer: 'finelets',
    expiresIn: "12h",
    algorithm: "HS256"
}

module.exports = (userMgr, axios = defaultAxios, jwt = defaultJwt, sessionMgr = defaultSessionMgr) => {
    const Appid = process.env.AppId,
    AppSecret = process.env.AppSecret,
    jwtSecret = process.env.JWT_SECRET,
    expiresIn = process.env.SessionExpiresIn
    defaultSignOptions.expiresIn = expiresIn || defaultSignOptions.expiresIn
    if(!Appid || !AppSecret || !jwtSecret) 
        throw 'To use WxJwtAuthenticate, you must set env AppSecret, JWT_SECRET, SessionExpiresIn correctly'
    return {
        forAll: (token)=>{
            let decode
            try {
                decode = jwt.verify(token, jwtSecret, defaultSignOptions)
                
            } catch (err) {
                return sessionMgr.removeToken(token)
            }

            const {user, openid} = decode
            if (openid) {
                return sessionMgr.findByOpenId(openid)
                    .then(session => {
                        if(!session) return
                        let sessionUser = {openid, session_key: session.session_key}
                        if(!user) return sessionUser
                        return userMgr.getUser(user)
                            .then(data=>{
                                return {...sessionUser, user: data}
                            })
                    })
            }
            return userMgr.getUser(user)
        },

        authenticate: ({code, username, password}) => {
            let token

            if (!code) {
                return userMgr.authenticate(username, password)
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
                        return userMgr.authenticate(username, password)
                        .then(user => {
                            if(user){
                                token = jwt.sign({openid, user: user.id}, jwtSecret, defaultSignOptions)
                                return sessionMgr.create({token, openid, userId: user.id, session_key})
                                    .then(()=>{
                                        return userMgr.createWechatUser({id: user.id, openid})
                                    })
                                    .then((data)=>{
                                        return {user: data, token}
                                    })
                            }
                            return
                        })
                    }
                    token = jwt.sign({openid}, jwtSecret, defaultSignOptions)
                    return sessionMgr.create({token, openid, session_key})
                        .then(()=>{
                            return userMgr.createWechatUser({openid})
                        })
                        .then((user)=>{
                            return {user, token}
                        })
                })
        }
    } 
}