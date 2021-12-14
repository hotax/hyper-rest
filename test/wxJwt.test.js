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
			const code = '1223456'
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

			it("正确身份验证", () => {
				authenticate.withArgs(code).resolves({token})
				return request.post('/auth/login')
					.send({code})
					.expect(200, {token})
					
			})

			it("微信身份验证失败", () => {
				authenticate.withArgs(code).resolves()
				return request.post('/auth/login')
					.send({code})
					.expect(403)
			})

			it("微信身份验证出错", () => {
				authenticate.withArgs(code).rejects()
				return request.post('/auth/login')
					.send({code})
					.expect(500)
			})

			it("可以配置身份验证Url", () => {
				loginUrl = '/foo'
				authenticate.withArgs(code).resolves({token})
				jwt(app, {authenticate, forAll:()=>{}, loginUrl})
				return request.post(loginUrl)
					.send({code})
					.expect(200, {token})
			})
		})

		describe('forAll - 过滤微信客户端每个请求', ()=>{
			const user = {data: 'any user info'}
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
				return request.get('/api/foo')
					.expect(401)
			})
			
			it("未能通过微信客户端请求头部authorization属性所设token解析出当前用户 - Forbidden", () => {
				forAll.withArgs(token).resolves()
				return request.get('/api/foo')
					.set('Authorization', `Bearer ${token}`)
					.expect(403)
			})

			it("授权微信客户端请求", () => {
				forAll.withArgs(token).resolves(user)
				app.get('/api/foo', (req, res)=> {
					return res.json(req.user)
				})
				return request.get('/api/foo')
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
			}).to.Throw()
		})

		describe('正确配置环境变量', () => {
			let axios, jwt, sessionMgr
	
			beforeEach(() => {
				process.env.AppId = appid
				process.env.AppSecret = appSecret
				process.env.JWT_SECRET = jwtSecret
				axios = {get: sinon.stub()}
				jwt = {sign: sinon.stub(), verify: sinon.stub()}
				sessionMgr = {create: sinon.stub(), findByOpenId: sinon.stub(), removeToken: sinon.stub()}
				wxJwtAuthenticate = require("../jwt/WxJwtAuthenticate")(axios, jwt, sessionMgr)
			})
			describe('authenticate - 微信身份验证', () => {
				it("无code， 微信登录失败", ()=>{
					return wxJwtAuthenticate.authenticate()
						.then(data => {
							expect(data).undefined
						})
				})
	
				it("微信登录", ()=>{
					expectedUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
					wxLoginInfo = {data: {openid, session_key}}
		
					axios.get.withArgs(expectedUrl).resolves(wxLoginInfo)
					jwt.sign.withArgs({openid}, jwtSecret, signOptions).returns(token)
					sessionMgr.create.withArgs({openid, session_key}).resolves()
		
					return wxJwtAuthenticate.authenticate(code)
						.then(data => {
							expect(data).eql({token})
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

				it("获得用户信息", ()=>{
					jwt.verify.withArgs(token, jwtSecret, signOptions).returns({openid})
					sessionMgr.findByOpenId.withArgs(openid).resolves({openid, session_key})
					return wxJwtAuthenticate.getUser(token)
						.then(data => {
							expect(data).eql({openid, session_key})
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