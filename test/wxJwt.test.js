const { expect, assert } = require('chai');

describe("Wx JWT", () => {
    const bodyParser = require('body-parser'), //TODO: body-parser已过时
		requestAgent = require('supertest');

	var app, stubs, err
	beforeEach(function () {
		stubs = {}
		err = new Error('any error message')
		app = require('express')();
		app.use(bodyParser.json()); 
		request = requestAgent(app);
	})

	describe("Wechat JWT", () => {
		let jwt

		beforeEach(() => {
			jwt = require('../jwt/WechatJwt')
		})

		it("必须提供身份认证方法 - authenticate", () => {
			expect(() => {
				jwt(app, {forAll: ()=>{}})
			}).to.Throw()
		})

		it("必须提供验证所有请求的方法 - forAll", () => {
			expect(() => {
				jwt(app, {authenticate: ()=>{}})
			}).to.Throw()
		})

		it("验证所有请求", () => {
			calls = 0
			forAll = (req, res, next) => {
				calls++
				next()
			}
			jwt(app, {authenticate:()=>{}, forAll})
			request.get('/api/foo')
				.expect(200)
				.end(function(err, res) {
					expect(calls).eql(1)
				})
		})

		it("可以配置基本url", () => {
			baseUrl = '/foo'
			authenticate = sinon.spy()
			calls = 0
			forAll = (req, res, next) => {
				calls++
				next()
			}
			jwt(app, {authenticate, forAll, baseUrl})
			request.get(baseUrl + '/foo')
				.expect(200)
				.end(function(err, res) {
					expect(calls).eql(1)
				})
		})

		it("身份验证", () => {
			calls = 0
			authenticate = (req, res) => {
				calls++
				res.end()
			}
			jwt(app, {authenticate, forAll:()=>{}})
			request.post('/auth/login')
				.send({})
				.expect(200)
				.end(function(err, res) {
					expect(calls).eql(1)
				})
		})

		it("可以配置身份验证Url", () => {
			loginUrl = '/foo'
			calls = 0
			authenticate = (req, res) => {
				calls++
				res.end()
			}
			jwt(app, {authenticate, forAll:()=>{}, loginUrl})
			request.post(loginUrl)
				.send({})
				.expect(200)
				.end(function(err, res) {
					expect(calls).eql(1)
				})
		})
	})    
})