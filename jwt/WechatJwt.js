const defaultLoginUrl = '/auth/login',
defaultBaseUrl = '/api'

const createJwt = (app, config) => {
    let {authenticate, forAll, appName, baseUrl, loginUrl} = config
    if (!authenticate || !forAll) {
        throw 'either authenticate or forAll should be required for JWT' 
    } 
    
    if(!loginUrl && appName) loginUrl = `/${appName}${defaultLoginUrl}`
    if(!baseUrl && appName) baseUrl = `/${appName}${defaultBaseUrl}`

    app.use(baseUrl || defaultBaseUrl, (req, res, next) => {
        if (req.headers.authorization) {
            let authStrs = req.headers.authorization.split('Bearer ')
            if (authStrs.length == 2 && authStrs[0] == '' && authStrs[1]) {
                return forAll(authStrs[1])
                    .then(user => {
                        if (user) {
                            req.user = user
                            return next()
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
            code, username, password
        } = req.body
        if (!code && !username) return res.status(403).end()

        return authenticate({code, username, password})
            .then(data => {
                if (!data) return res.status(401).end()
                return res.json(data)
            })
            .catch(e => {
                return res.status(500).end()
            })
    })
}

module.exports = createJwt