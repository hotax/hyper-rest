// const { expect, assert } = require('chai');

const { expect } = require('chai');

describe("Wx JWT", () => {
    const bodyParser = require('body-parser'), //TODO: body-parser已过时
		requestAgent = require('supertest');

	let app, stubs, err
	beforeEach(()=>{
		stubs = {}
		err = new Error('any error message')
		app = require('express')();
		app.use(bodyParser.json()); 
		request = requestAgent(app);
	})

	describe("WechatJwt", () => {
		const token = 'token'
		let jwt

		beforeEach(() => {
			jwt = require('../jwt/WechatJwt')
		})

		describe('authenticate - 微信登录服务', () => {
			const code = '1223456', 
			username = 'foo',
			password = 'password'
			objIncludeToken = {data: 'any data authenticate returns'}
			let authenticate

			beforeEach(() => {
				authenticate = sinon.stub()
				jwt(app, {authenticate, forAll:()=>{}})
			})

			it("必须提供身份认证方法 - authenticate", () => {
				expect(() => {
					jwt(app, {forAll: ()=>{}})
				}).to.Throw()
			})


			it("登录请求未提供code或userId和password", () => {
				return request.post('/auth/login')
					.send({})
					.expect(403)
					.then(res => {
						expect(authenticate.callCount).eql(0)
					})
					
			})

			it("正确身份验证", () => {
				authenticate.withArgs({code, username, password}).resolves(objIncludeToken)
				return request.post('/auth/login')
					.send({code, username, password})
					.expect(200, objIncludeToken)
					
			})

			it("身份验证失败", () => {
				authenticate.withArgs({code, username, password}).resolves()
				return request.post('/auth/login')
					.send({code, username, password})
					.expect(401)
			})

			it("微信身份验证出错", () => {
				authenticate.withArgs({code, username, password}).rejects()
				return request.post('/auth/login')
					.send({code, username, password})
					.expect(500)
			})

			it("可以配置身份验证Url", () => {
				loginUrl = '/foo'
				authenticate.withArgs({code, username, password}).resolves(objIncludeToken)
				jwt(app, {authenticate, forAll:()=>{}, loginUrl})
				return request.post(loginUrl)
					.send({code, username, password})
					.expect(200, objIncludeToken)
			})
		})

		describe('forAll - 过滤微信客户端每个请求', ()=>{
			const user = {data: 'any user info'},
			defaultBaseUrl = '/api'
			let forAll

			beforeEach(() => {
				forAll = sinon.stub()
				jwt(app, {authenticate: ()=>{}, forAll})
			})

			it("必须提供验证所有请求的方法 - forAll", () => {
				expect(() => {
					jwt(app, {authenticate: ()=>{}})
				}).to.Throw()
			})

			it("微信客户端请求头部authorization属性设置错误 - Unauthorized", () => {
				return request.get(`${defaultBaseUrl}/foo`)
					.expect(401)
			})
			
			it("未能通过微信客户端请求头部authorization属性所设token解析出当前用户 - Forbidden", () => {
				forAll.withArgs(token).resolves()
				return request.get(`${defaultBaseUrl}/foo`)
					.set('Authorization', `Bearer ${token}`)
					.expect(403)
			})

			it("授权微信客户端请求", () => {
				forAll.withArgs(token).resolves(user)
				app.get(`${defaultBaseUrl}/foo`, (req, res)=> {
					return res.json(req.user)
				})
				return request.get(`${defaultBaseUrl}/foo`)
					.set('Authorization', `Bearer ${token}`)
					.expect(200, user)
			})

			it("可以配置基本url", () => {
				baseUrl = '/foo'
				forAll.withArgs(token).resolves(user)
				jwt(app, {authenticate: ()=>{}, forAll, baseUrl})
				app.get(baseUrl, (req, res)=> {
					return res.json(req.user)
				})
				return request.get(baseUrl)
					.set('Authorization', `Bearer ${token}`)
					.expect(200, user)
			})
		})
	})
	
	describe("WxJwtAuthenticate", ()=>{
		const code = "123456",
			appid = "appid",
			appSecret = "secret",
			openid = "openid",
			username = 'foo userid',
			password = 'foo password',
			id = 'user db id',
			user = {id, data: 'any user info'}
			session_key = "session_key",
			jwtSecret = "JWT_SECRET",
			signOptions = {
				issuer: 'finelets',
				expiresIn: "12h",
				algorithm: "HS256"
			},
			token = "token"

		let wxJwtAuthenticate;

		it('未正确设置环境变量', () => {
			expect(() => {
				require('../jwt/WxJwtAuthenticate')()
			}).to.Throw('To use WxJwtAuthenticate, you must set env AppSecret, JWT_SECRET, SessionExpiresIn correctly')
		})

		describe('正确配置环境变量', () => {
			let axios, jwt, sessionMgr
	
			beforeEach(() => {
				process.env.AppId = appid
				process.env.AppSecret = appSecret
				process.env.JWT_SECRET = jwtSecret
				userMgr = {
					authenticate: sinon.stub(),
					getUser: sinon.stub()
				}
				axios = {get: sinon.stub()}
				jwt = {sign: sinon.stub(), verify: sinon.stub()}
				sessionMgr = {
					create: sinon.stub(), 
					findByOpenId: sinon.stub(),
					removeToken: sinon.stub()
				}
				wxJwtAuthenticate = require("../jwt/WxJwtAuthenticate")(userMgr, axios, jwt, sessionMgr)
			})
			describe('authenticate - 微信身份验证', () => {
				describe('无code - 非微信客户端登录', ()=>{
					it("身份认证失败", ()=>{
						userMgr.authenticate.withArgs(username, password).resolves()
						return wxJwtAuthenticate.authenticate({username, password})
							.then(data => {
								expect(data).undefined
							})
					})
	
					it("身份认证出错", ()=>{
						userMgr.authenticate.withArgs(username, password).rejects()
						return wxJwtAuthenticate.authenticate({username, password})
							.should.be.rejectedWith()
					})

					describe('身份认证成功， 签名产生令牌', ()=>{
						beforeEach(() => {
							userMgr.authenticate.withArgs(username, password).resolves(user)
						})

						it("数字签名出错", ()=>{
							jwt.sign.withArgs({user: id}, jwtSecret, signOptions).throws()
							return wxJwtAuthenticate.authenticate({username, password})
								.should.be.rejectedWith()
						})

						it('数字签名成功', ()=>{
							jwt.sign.withArgs({user: id}, jwtSecret, signOptions).returns(token)
							return wxJwtAuthenticate.authenticate({username, password})
								.then(data => {
									expect(data).eql({user, token})
								})
						})
					})
				})
				
				describe('微信客户端登录', ()=>{
					const expectedUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`

					it("微信登录出错", ()=>{						
						axios.get.withArgs(expectedUrl).rejects()
			
						return wxJwtAuthenticate.authenticate({code})
							.should.be.rejectedWith()
					})

					it('微信登录失败', ()=>{
						const errmsg = "invalid code, rid: 61b9a5d9-7e777985-2572830c"
						axios.get.withArgs(expectedUrl).resolves({data:{errmsg}})
			
						return wxJwtAuthenticate.authenticate({code})
							.should.be.rejectedWith(`Wechat login fail: ${errmsg}`)
					})

					describe('微信登录成功', ()=>{
						beforeEach(() => {
							axios.get.withArgs(expectedUrl).resolves({data:{openid, session_key}})
						})

						describe('包含userId、password身份信息， 需进一步身份认证', ()=>{
							it("进一步身份认证失败", ()=>{
								userMgr.authenticate.withArgs(username, password).resolves()
								return wxJwtAuthenticate.authenticate({code, username, password})
									.then(data => {
										expect(data).undefined
									})
							})
			
							it("进一步身份认证出错", ()=>{
								userMgr.authenticate.withArgs(username, password).rejects()
								return wxJwtAuthenticate.authenticate({code, username, password})
									.should.be.rejectedWith()
							})

							describe('进一步身份认证成功， 数字签名', ()=>{
								beforeEach(() => {
									userMgr.authenticate.withArgs(username, password).resolves(user)
								})

								it("数字签名出错", ()=>{
									jwt.sign.withArgs({openid, id}, jwtSecret, signOptions).throws()
									return wxJwtAuthenticate.authenticate({code, username, password})
										.should.be.rejectedWith()
								})
		
								describe('数字签名成功, 创建会话', ()=>{
									beforeEach(() => {
										jwt.sign.withArgs({openid, user: id}, jwtSecret, signOptions).returns(token)
									})
									
									it("创建会话出错", ()=>{
										sessionMgr.create.withArgs({token, openid, session_key, id}).throws()
										return wxJwtAuthenticate.authenticate({code, username, password})
											.should.be.rejectedWith()
									})

									it("创建会话成功", ()=>{
										sessionMgr.create.withArgs({token, openid, session_key, userId: id}).resolves()
										return wxJwtAuthenticate.authenticate({code, username, password})
											.then(data => {
												expect(data).eql({user, token})
											})
									})
								})
							})
		
						})

						describe('无userId、password身份信息， 数字签名', ()=>{
							it("数字签名出错", ()=>{
								jwt.sign.withArgs({openid}, jwtSecret, signOptions).throws()
								return wxJwtAuthenticate.authenticate({code})
									.should.be.rejectedWith()
							})
	
							describe('数字签名成功, 创建会话', ()=>{
								beforeEach(() => {
									jwt.sign.withArgs({openid}, jwtSecret, signOptions).returns(token)
								})
								
								it("创建会话出错", ()=>{
									sessionMgr.create.withArgs({token, openid, session_key}).throws()
									return wxJwtAuthenticate.authenticate({code})
										.should.be.rejectedWith()
								})

								it("创建会话成功", ()=>{
									sessionMgr.create.withArgs({token, openid, session_key}).resolves()
									return wxJwtAuthenticate.authenticate({code})
										.then(data => {
											expect(data).eql({token})
										})
								})
							})
						})
					})
				})
			})
	
			describe('getUser - 解析token获取用户信息', () => {
				it("token无效", ()=>{
					jwt.verify.withArgs(token, jwtSecret, signOptions).throws()
					sessionMgr.removeToken.withArgs(token).resolves()
					return wxJwtAuthenticate.getUser(token)
						.then(data => {
							expect(data).undefined
							expect(sessionMgr.removeToken.callCount).eql(1)
						})
				})

				describe('token解析后仅包含user - 请求来自于非微信客户端', ()=>{
					beforeEach(() => {
						jwt.verify.withArgs(token, jwtSecret, signOptions).returns({user: id})
					})

					it("获得用户信息出错", ()=>{
						userMgr.getUser.withArgs(id).rejects()
						return wxJwtAuthenticate.getUser(token)
							.should.be.rejectedWith()
					})

					it("未查找到用户", ()=>{
						userMgr.getUser.withArgs(id).resolves()
						return wxJwtAuthenticate.getUser(token)
							.then(data => {
								expect(data).undefined
							})
					})

					it("获得业务用户信息", ()=>{
						userMgr.getUser.withArgs(id).resolves(user)
						return wxJwtAuthenticate.getUser(token)
							.then(data => {
								expect(data).eql(user)
							})
					})
				}
				)
				describe('token解析后仅包含openid - 请求来自于微信客户端且未同业务用户关连', ()=>{
					beforeEach(() => {
						jwt.verify.withArgs(token, jwtSecret, signOptions).returns({openid})
					})

					it("访问会话出错", ()=>{
						sessionMgr.findByOpenId.withArgs(openid).rejects()
						return wxJwtAuthenticate.getUser(token)
							.should.be.rejectedWith()
					})

					it("未找到会话", ()=>{
						sessionMgr.findByOpenId.withArgs(openid).resolves()
						return wxJwtAuthenticate.getUser(token)
							.then(data => {
								expect(data).undefined
							})
					})

					it("获得会话", ()=>{
						sessionMgr.findByOpenId.withArgs(openid).resolves({openid, session_key, data: 'any data in session record'})
						return wxJwtAuthenticate.getUser(token)
							.then(data => {
								expect(data).eql({openid, session_key})
							})
					})
				})

				describe('token解析后包含openid和user - 请求来自于微信客户端已同业务用户关连', ()=>{
					beforeEach(() => {
						jwt.verify.withArgs(token, jwtSecret, signOptions).returns({openid, user: id})
					})

					it("访问会话出错", ()=>{
						sessionMgr.findByOpenId.withArgs(openid).rejects()
						return wxJwtAuthenticate.getUser(token)
							.should.be.rejectedWith()
					})

					it("未找到会话", ()=>{
						sessionMgr.findByOpenId.withArgs(openid).resolves()
						return wxJwtAuthenticate.getUser(token)
							.then(data => {
								expect(data).undefined
							})
					})

					it("获得会话", ()=>{
						sessionMgr.findByOpenId.withArgs(openid).resolves({openid, session_key, data: 'any data in session record'})
						userMgr.getUser.withArgs(id).resolves(user)
						return wxJwtAuthenticate.getUser(token)
							.then(data => {
								expect(data).eql({openid, session_key, user})
							})
					})
				})
			})
		})
	})

	describe('WxSessions', () => {
		let err;
		const ID_NOT_EXIST = '5ce79b99da3537277c3f3b66'
		const token = 'token',
			openid = 'openid',
			session_key = 'session_key'

		let schema, testTarget, id, __v
	
		beforeEach(function () {
			err = new Error('any error message');
			schema = require('../jwt/WxSessionsMongoDbSchema')
			testTarget = require('../jwt/WxSessions')
			return clearDB();
		})
	
		describe('创建微信会话', () => {
			it('无token', () => {
				return testTarget.create({openid, session_key})
					.should.be.rejectedWith()
			})

			it('无openid', () => {
				return testTarget.create({token, session_key})
					.should.be.rejectedWith()
			})

			it('无session_key', () => {
				return testTarget.create({token, openid})
					.should.be.rejectedWith()
			})

			it('正确创建微信会话', () => {
				return testTarget.create({token, openid, session_key})
					.then(doc => {
						return schema.findById(doc.id)
					})
					.then(doc => {
						doc = doc.toJSON()
						expect(doc.token).eql(token)
						expect(doc.session_key).eql(session_key)
						expect(doc.openid).eql(openid)
					})
			})
		})

		describe('删除无效token', ()=>{
			beforeEach(function () {
				return dbSave(schema, {token, openid, session_key})
			})

			it('指定token不在数据库中', ()=>{
				return testTarget.removeToken('not exist')
					.then((data)=>{
						expect(data).undefined
					})
			})

			it('正确删除', ()=>{
				return testTarget.removeToken(token)
					.then((data)=>{
						expect(data).undefined
					})
			})
		})
	})
})

describe('jsonwebtoken tests', ()=>{
	it('过期', (done)=>{
		var jwt = require('jsonwebtoken');
		var token = jwt.sign({ foo: 'bar' }, 'shhhhh', { expiresIn: 1});
		setTimeout(()=> {
			jwt.verify(token, 'shhhhh', (err, decode) => {
				expect(err).exist
				done()
			});
		}, 2000);
	})

	it('stub', ()=>{
		stub = sinon.stub()
		stub.withArgs({openid: '1'}).resolves(1)
		return stub({openid: '1'})
			.then(data=>{
				expect(data).eql(1)
			})
	})
})