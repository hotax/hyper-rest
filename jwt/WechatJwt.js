const jwt = require('jsonwebtoken'),
    fs = require('fs');

const defaultLoginUrl = '/auth/login'
const defaultBaseUrl = '/api'
const defaultSignOptions = {
    issuer: 'finelets',
    expiresIn: "12h",
    algorithm: "HS256"
}
// let __config

/* const forAll = (req, res, next) => {
    let code = 401
    if (req.headers.authorization) {
        try {
            let authStrs = req.headers.authorization.split('Bearer ')
            if (authStrs.length == 2 && authStrs[0] == '' && authStrs[1]) {
                code = 403
                let options = {
                    issuer: defaultSignOptions.issuer,
                    algorithms: ["HS256"]
                }
                let decoded = jwt.verify(authStrs[1], process.env.JWT_SECRET, options)
                return __config.getUser(decoded.user)
                    .then(user => {
                        req.user = user
                        next()
                    })
                    .catch(() => {})
            }
        } catch (err) {}
    }

    return res.status(code).end()
}

const authenticate = (req, res) => {
    const {
        username,
        password
    } = req.body
    return __config.authenticate(username, password)
        .then(user => {
            if (!user) return res.status(403).end()
            let token = jwt.sign({
                user: user.id
            }, process.env.JWT_SECRET, defaultSignOptions)
            let result = {
                user,
                token
            }
            return res.json(result)
        })
        .catch(e => {
            return res.status(500).end()
        })
} */

const expressJwt = (app, config) => {
    const {authenticate, forAll, expiresIn, baseUrl, loginUrl} = config
    if (!authenticate || !forAll) throw 'either authenticate or forAll should be required for JWT' 
    defaultSignOptions.expiresIn = expiresIn || defaultSignOptions.expiresIn
    app.use(baseUrl || defaultBaseUrl, forAll)
    app.post(loginUrl || defaultLoginUrl, authenticate)
}

module.exports = expressJwt