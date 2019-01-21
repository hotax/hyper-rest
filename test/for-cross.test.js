const proxyquire = require('proxyquire'),
    path = require('path');

describe('Cross', () => {
    const bodyParser = require('body-parser'),
		requestAgent = require('supertest');

	var app, stubs, err
	beforeEach(function () {
		stubs = {}
		err = new Error('any error message')
		app = require('express')();
		app.use(bodyParser.json());
		request = requestAgent(app);
	})

	describe('JWT - User Authentication', () => {
		const defaultUriLogin = '/auth/login'
		const username = 'foo'
		const password = 'pwd'
		const userId = '12343445'
		const user = {
			id: userId
		}
		const secret = 'any secret'
		let defaultSignOptions
		const token = 'dummytoken'
		let jsonwebtoken
		let jwt, jwtConfig, authenticate

		beforeEach(() => {
			process.env.JWT_SECRET = secret
			defaultSignOptions = {
				issuer: 'finelets',
				expiresIn: "12h",
				algorithm: "HS256"
			}

			jsonwebtoken = sinon.stub({
				sign: () => {},
				verify: () => {}
			})
			stubs['jsonwebtoken'] = jsonwebtoken
			authenticate = sinon.stub()
			getUser = sinon.stub()
			jwtConfig = {
				authenticate,
				getUser
			}
			jwt = proxyquire('../jwt/ExpressJwt', stubs)
		})

		it('未配置用户身份认证方法', () => {
			delete jwtConfig.authenticate
			expect(() => {
				jwt(app, jwtConfig)
			}).throws('authenticate should be required for JWT')
		})

		it('未配置getUser方法', () => {
			delete jwtConfig.getUser
			expect(() => {
				jwt(app, jwtConfig)
			}).throws('getUser should be required for JWT')
		})

		it('进行用户身份认证时出错', (done) => {
			authenticate.withArgs(username, password).rejects()
			jwt(app, jwtConfig)
			request.post(defaultUriLogin)
				.send({
					username,
					password
				})
				.expect(500, done)
		})

		it('未通过用户身份认证', (done) => {
			authenticate.withArgs(username, password).resolves(null)
			jwt(app, jwtConfig)
			request.post(defaultUriLogin)
				.send({
					username,
					password
				})
				.expect(403, done)
		})

		it('登录成功', (done) => {
			authenticate.withArgs(username, password).resolves(user)
			jsonwebtoken.sign.withArgs({
				user: userId
			}, secret, defaultSignOptions).returns(token)
			jwt(app, jwtConfig)
			request.post(defaultUriLogin)
				.send({
					username,
					password
				})
				.expect(200, {
					user,
					token
				}, done)
		})

		it('请求头部需要给出authorization信息', (done) => {
			jwt(app, jwtConfig)
			request.get('/api/foo')
				.expect(401, done)
		})

		it('请求头部需要给出authorization信息格式为"Bearer token"', (done) => {
			jwt(app, jwtConfig)
			request.get('/api/foo')
				.set('Authorization', 'aBearer ' + token)
				.expect(401, done)
		})

		it('token无效', (done) => {
			jsonwebtoken.verify.withArgs(token, secret, {
				issuer: 'finelets',
				algorithms: ["HS256"]
			}).throws(err)
			jwt(app, jwtConfig)
			request.get('/api/foo')
				.set('Authorization', 'Bearer ' + token)
				.expect(403, done)
		})

		it('token有效', (done) => {
			const decoded = {
				user: userId
			}
			jsonwebtoken.verify.withArgs(token, secret, {
				issuer: 'finelets',
				algorithms: ["HS256"]
			}).returns(decoded)
			getUser.withArgs(userId).resolves(user)
			jwt(app, jwtConfig)

			let called = false
			app.get('/api/foo', (req, res) => {
				expect(req.user).eqls(user)
				called = true
				return res.end()
			})
			request.get('/api/foo')
				.set('Authorization', 'Bearer ' + token)
				.expect(200, () => {
					expect(called).true
					done()
				})
		})

		it('设置token过期时间', (done) => {
			authenticate.withArgs(username, password).resolves(user)
			getUser.withArgs(userId).resolves(user)
			jwtConfig.expiresIn = 1
			jwtConfig.loginUrl = '/auth/auth'
			jwtConfig.baseUrl = '/foo'

			jwt = require('../jwt/ExpressJwt')
			jwt(app, jwtConfig)

			let called = 0
			app.get('/foo/foo', (req, res) => {
				expect(req.user).eqls(user)
					++called
				return res.end()
			})

			request.post('/auth/auth') // LOGIN
				.send({
					username,
					password
				})
				.expect(200)
				.end((err, res) => {
					expect(res.body.user).eqls(user)
					request.get('/foo/foo') // First get
						.set('Authorization', 'Bearer ' + res.body.token)
						.expect(200, () => {
							expect(called).eqls(1)
							setTimeout(() => {
								request.get('/foo/foo') // Second get after 1.5s
									.set('Authorization', 'Bearer ' + res.body.token)
									.expect(403, () => {
										expect(called).eqls(1)
										done()
									})
							}, 1000)
						})

				})
		})
	})

})