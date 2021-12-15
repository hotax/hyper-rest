const defaultLoginUrl = '/auth/login',
defaultBaseUrl = '/api'

const expressJwt = (app, config) => {
    const {authenticate, forAll, baseUrl, loginUrl} = config
    if (!authenticate || !forAll) {
        throw 'either authenticate or forAll should be required for JWT' 
    } 
    
    app.use(baseUrl || defaultBaseUrl, (req, res, next) => {
        if (req.headers.authorization) {
            let authStrs = req.headers.authorization.split('Bearer ')
            if (authStrs.length == 2 && authStrs[0] == '' && authStrs[1]) {
                return forAll(authStrs[1])
                    .then(user => {
                        if (user) {
                            req.user = user
                            next()
                        }
                        return res.status(403).end()
                    })
                    .catch(() => {
                        return res.status(500).end()
                    })
            }
        }

        return res.status(401).end()
    })

    app.post(loginUrl || defaultLoginUrl, (req, res) => {
        const {
            code, userId, password
        } = req.body
        if (!code && !userId) return res.status(403).end()

        return authenticate({code, userId, password})
            .then(token => {
                if (!token) return res.status(401).end()
                return res.json({token})
            })
            .catch(e => {
                return res.status(500).end()
            })
    })
}

module.exports = expressJwt