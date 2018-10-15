/**
 * Created by clx on 2017/10/9.
 */
var moment = require('moment'),
	should = require('should'),
	proxyquire = require('proxyquire'),
	path = require('path'),
	util = require('util'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

describe('hyper-rest', function() {
	var func, stubs, err, reason, createReasonMock;
	beforeEach(function() {
		stubs = {};
		err = new Error('any error message');
		reason = {
			reason: 'any reason representing any error'
		};
		createReasonMock = {
			createErrorReason: sinon.stub()
		};
	});

	describe('Auth2', function() {
		const requestAgent = require('supertest'),
			app = require('express')(),
			request = requestAgent(app),
			bodyParser = require('body-parser'),
			auth2 = require('../auth2/ExpressAuth2');
		var oauth;

		beforeEach(function() {
			app.use(
				bodyParser.urlencoded({
					extended: true
				})
			);
		});

		describe('验证bearerToken', function() {
			const bearerToken = '12345',
				getAccessTokenStub = sinon.stub();
			var handlerMock;

			beforeEach(function() {
				oauth = auth2({
					model: {
						getAccessToken: getAccessTokenStub
					}
				});
				oauth.attachTo(app);
				handlerMock = sinon.stub();
			});

			it('bearerToken验证时出现例外', function() {
				getAccessTokenStub.withArgs(bearerToken).returns(Promise.reject(err));
				oauth.authorize('get', '/api', handlerMock);
				return request.get('/api').set('Authorization', 'Bearer ' + bearerToken).expect(500);
			});

			it('bearerToken验证失败', function() {
				getAccessTokenStub.withArgs(bearerToken).returns(Promise.resolve(null));
				oauth.authorize('get', '/api', handlerMock);
				return request.get('/api').set('Authorization', 'Bearer ' + bearerToken).expect(500);
			});

			describe('bearerToken验证成功', function() {
				const token = {
					expires: moment()
				};

				beforeEach(function() {
					getAccessTokenStub.withArgs(bearerToken).returns(Promise.resolve(token));
				});

				it('如果bearerToken验证成功，但已过期', function() {
					oauth.authorize('get', '/api', handlerMock);
					return request.get('/api').set('Authorization', 'Bearer ' + bearerToken).expect(500);
				});

				describe('token未过期', function() {
					beforeEach(function() {
						token.expires.add(1, 'minute');
					});

					it('Token中包含user对象', function() {
						const user = {
							data: 'any data of user'
						};
						token.user = user;

						handlerMock = function(req, res) {
							expect(req.user).eqls(user);
							return res.end();
						};
						oauth.authorize('get', '/api', handlerMock);
						return request.get('/api').set('Authorization', 'Bearer ' + bearerToken).expect(200);
					});

					it('Token中只包含userId', function() {
						const userId = 'foo';
						token.userId = userId;

						var handlerMock = function(req, res) {
							expect(req.user.id).eqls(userId);
							return res.end();
						};

						oauth.authorize('get', '/api', handlerMock);
						return request.get('/api').set('Authorization', 'Bearer ' + bearerToken).expect(200);
					});
				});
			});
		});

		describe('登录', function() {
			beforeEach(function(done) {
				oauth = auth2();
				oauth.attachTo(app);
				return clearDB(done);
			});

			it('指定用户未注册时，登录失败', function() {
				return request
					.post('/auth/login')
					.set('Accept', 'application/x-www-form-urlencoded')
					.send('username=foo&password=pwd&grant_type=password&client_id=null&client_secret=null')
					.expect(503);
			});

			it('登录成功', function() {
				var dbSave = require('../db/mongoDb/SaveObjectToDb');
				var userDbSchema = require('../auth2/db/MongoDbAuth2Schema').dbSchema.OAuthUsers;
				return dbSave(userDbSchema, {
					username: 'foo',
					password: 'pwd'
				})
					.then(function() {
						return request
							.post('/auth/login')
							.set('Accept', 'application/x-www-form-urlencoded')
							.send('username=foo&password=pwd&grant_type=password&client_id=null&client_secret=null')
							.expect(200);
					})
					.then(function(res) {
						expect(res.body.access_token).not.null;
						expect(res.body.token_type).eqls('bearer');
						expect(res.body.expires_in).eqls(3600);
					});
			});

			describe('自定义getUser', function() {
				const getUserStub = sinon.stub();

				beforeEach(function() {
					oauth = auth2({
						model: {
							getUser: getUserStub
						}
					});
					oauth.attachTo(app);
				});

				it('认证用户时出现任何例外均导致登录失败', function() {
					getUserStub.withArgs('foo', 'pwd').returns(Promise.reject(err));

					return request
						.post('/auth/login')
						.set('Accept', 'application/x-www-form-urlencoded')
						.send('username=foo&password=pwd&grant_type=password&client_id=null&client_secret=null')
						.expect(503);
				});

				it('未通过用户认证时，登录失败', function() {
					getUserStub.withArgs('foo', 'pwd').returns(Promise.resolve(false));
					return request
						.post('/auth/login')
						.set('Accept', 'application/x-www-form-urlencoded')
						.send('username=foo&password=pwd&grant_type=password&client_id=null&client_secret=null')
						.expect(503);
				});

				it('通过用户认证时，登录成功', function() {
					getUserStub.withArgs('foo', 'pwd').returns(
						Promise.resolve({
							id: 'any user id'
						})
					);
					return request
						.post('/auth/login')
						.set('Accept', 'application/x-www-form-urlencoded')
						.send('username=foo&password=pwd&grant_type=password&client_id=null&client_secret=null')
						.expect(200)
						.then(function(res) {
							expect(res.body.access_token).not.null;
							expect(res.body.token_type).eqls('bearer');
							expect(res.body.expires_in).eqls(3600);
						});
				});
			});
		});
	});

	describe('出错原因', function() {
		var createErrorReason, code, msg;
		var res, statusMock, sendMock;
		beforeEach(function() {
			createErrorReason = require('../app/CreateErrorReason');
			res = {
				status: sinon.spy(),
				send: sinon.spy()
			};
		});

		it('可设置express响应', function() {
			code = 404;
			msg = 'foo msg';
			var reason = createErrorReason(code, msg);
			reason.sendStatusTo(res);
			expect(res.status.calledWith(code));
			expect(res.send.calledWith(msg));
		});
	});

	describe('Session', function() {
		describe('基于Mongodb的Session管理', function() {
			it('session', function(done) {
				var requestAgent = require('supertest');
				var app = require('express')();
				var session = require('express-session');
				const MongoStore = require('connect-mongo')(session);
				app.use(
					session({
						secret: 'this-is-a-secret-token',
						cookie: {
							maxAge: 60000
						},
						store: new MongoStore({
							url: 'mongodb://localhost/test'
						})
					})
				);

				app.get('/', function(req, res, next) {
					var sessData = req.session;
					sessData.someAttribute = 'foo';
					res.send('Returning with some text');
				});
				app.get('/bar', function(req, res, next) {
					var someAttribute = req.session.someAttribute;
					res.send(`This will print the attribute I set earlier: ${someAttribute}`);
				});

				var request = requestAgent(app);
				request.get('/').end(function(err, res) {
					request.get('/bar').expect(200).end(function(err, res) {
						err = err;
						done();
					});
				});
			});
		});
	});

	describe('同数据库相关部件', function() {
		it('开发人员可以通过mongoose使应用连接到mongoDb数据库', function() {
			process.env.MONGODB = 'mongodb://localhost/jingyin';
			var connectDb = require('../db/mongoDb/ConnectMongoDb');
			connectDb(function() {});
		});

		describe('createObjectId', function() {
			it('非法标识', function() {
				createReasonMock.createErrorReason.returns(reason);
				stubs['../../app'] = createReasonMock;
				func = proxyquire('../db/mongoDb/CreateObjectId', stubs);
				return func('1234')
					.then(function() {
						throw 'failed';
					})
					.catch(function(err) {
						expect(reason).eqls(err);
					});
			});

			it('合法标识', function() {
				func = require('../db/mongoDb/CreateObjectId');
				return func('5ac0c25b0f72e70cd9d065b0').then(function(data) {
					expect(data).eqls(require('mongodb').ObjectID('5ac0c25b0f72e70cd9d065b0'));
				});
			});

			it('仅仅检查合法性不转化为ObjectId', function() {
				func = require('../db/mongoDb/CreateObjectId');
				return func('5ac0c25b0f72e70cd9d065b0', false).then(function(data) {
					expect(data).eqls('5ac0c25b0f72e70cd9d065b0');
				});
			});
		});

		describe('分页查询工厂', function() {
			var execStub, Schema, SchemaMock, paginatingQuery;
			var dbdata, countNum, expectedData;
			var options;

			beforeEach(function() {
				execStub = sinon.stub();
				Schema = {
					find: function() {},
					select: function() {},
					limit: function() {},
					skip: function() {},
					sort: function() {},
					count: function() {},
					exec: execStub
				};
				SchemaMock = sinon.mock(Schema);

				dbdata = [
					{
						data: 'foo'
					},
					{
						data: 'fee'
					}
				];
				countNum = 300;
				expectedData = {
					items: dbdata,
					total: countNum,
					page: 1,
					perpage: 10
				};

				execStub.returns(Promise.resolve(dbdata));
				execStub.onCall(0).returns(Promise.resolve(dbdata));
				execStub.onCall(1).returns(Promise.resolve(countNum));

				SchemaMock.expects('count').withArgs().once().returns(Schema);
				paginatingQuery = require('../db/mongoDb/PaginatingQuery');

				options = {
					schema: Schema
				};
			});

			it('未指定查询选项', function() {
				expect(function() {
					paginatingQuery.query();
				}).throw('a query options with db schema should be given');
			});

			it('未指定查询集合', function() {
				expect(function() {
					paginatingQuery.query({});
				}).throw('a query options with db schema should be given');
			});

			it('查询指定集合', function(done) {
				SchemaMock.expects('find').withArgs({}).once().returns(Schema);
				SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
				SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

				paginatingQuery.query(options).then(function(data) {
					expect(data).eql(expectedData);
					SchemaMock.verify();
					done();
				});
			});

			it('指定查询条件', function(done) {
				var queryconditions = {
					conditions: 'any query conditions'
				};
				SchemaMock.expects('find').withArgs(queryconditions).once().returns(Schema);
				SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
				SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

				options.conditions = queryconditions;
				paginatingQuery.query(options).then(function(data) {
					expect(data).eql(expectedData);
					SchemaMock.verify();
					done();
				});
			});

			it('指定查询输出字段', function(done) {
				var select = 'f1 f2';
				SchemaMock.expects('select').withArgs(select).once().returns(Schema);
				SchemaMock.expects('find').withArgs({}).once().returns(Schema);
				SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
				SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

				options.select = select;
				paginatingQuery.query(options).then(function(data) {
					expect(data).eql(expectedData);
					SchemaMock.verify();
					done();
				});
			});

			it('指定每页记录数', function(done) {
				var perpage = 5;
				SchemaMock.expects('find').withArgs({}).once().returns(Schema);
				SchemaMock.expects('limit').withArgs(perpage).once().returns(Schema);
				SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

				options.perpage = perpage;
				expectedData.perpage = perpage;
				paginatingQuery.query(options).then(function(data) {
					expect(data).eql(expectedData);
					SchemaMock.verify();
					done();
				});
			});

			it('指定当前页', function(done) {
				var page = 3;
				SchemaMock.expects('find').withArgs({}).once().returns(Schema);
				SchemaMock.expects('limit').withArgs().once().returns(Schema);
				SchemaMock.expects('skip').withArgs(20).once().returns(Schema);

				options.page = page;
				expectedData.page = page;

				paginatingQuery.query(options).then(function(data) {
					expect(data).eql(expectedData);
					SchemaMock.verify();
					done();
				});
			});

			it('指定数据库返回数组中各项数据元素的处理方法', function(done) {
				SchemaMock.expects('find').withArgs({}).once().returns(Schema);
				SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
				SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

				var dataHandleStub = sinon.stub();
				dataHandleStub.withArgs(dbdata[0]).returns('foo');
				dataHandleStub.withArgs(dbdata[1]).returns('fee');

				options.handler = dataHandleStub;
				paginatingQuery.query(options).then(function(data) {
					expect(data).eql({
						items: [ 'foo', 'fee' ],
						total: countNum,
						page: 1,
						perpage: 10
					});
					SchemaMock.verify();
					done();
				});
			});
		});

		describe('数据库', function() {
			var dbSave, model;
			beforeEach(function() {
				clearDB(dbURI);
			});

			it('Db object saver', function() {
				var dbSchema = new mongoose.Schema({
					foo: String,
					fee: String
				});
				model = mongoose.model('coll', dbSchema);

				dataToAdd = {
					foo: 'foo',
					fee: 'fee'
				};
				dbSave = require('../db/mongoDb/SaveObjectToDb');
				return dbSave(model, dataToAdd)
					.then(function(data) {
						expect(data).not.null;
						return model.find();
					})
					.then(function(data) {
						expect(data.length).eqls(1);
					})
					.catch(function(e) {
						throw e;
					});
			});
		});
	});

	describe('Restful', function() {
		describe('基于目录内资源描述文件的资源加载器', function() {
			var descDir, loader;

			beforeEach(function() {
				descDir = path.join(__dirname, './data/rests');
			});

			it('指定的资源目录不存在', function() {
				descDir = path.join(__dirname, './data/fff');
				const createLoader = function() {
					return require('../rests/DirectoryResourceDescriptorsLoader')(descDir);
				};
				const errMsg = util.format('The resources descriptions dir[%s] dose not exist!', descDir);
				assert.throws(createLoader, Error, errMsg);
			});

			it('加载一个资源描述', function() {
				loader = require('../rests/DirectoryResourceDescriptorsLoader')(descDir);
				var fooDesc = require('./data/rests/foo');
				expect(loader.loadAll()).eql({
					foo: fooDesc
				});
			});
		});

		describe('对Rest服务的解析', function() {
			const bodyParser = require('body-parser'),
				requestAgent = require('supertest'),
				app = require('express')(),
				request = requestAgent(app);

			var url, desc, currentResource;
			var selfUrl, urlResolveStub, restDescriptor;

			beforeEach(function() {
				url = '/rests/foo';
				app.use(bodyParser.json());
				err = 'any error ....';
				currentResource = {
					getResourceId: function() {},
					getUrl: function() {},
					getTransitionUrl: function() {},
					getLinks: function() {}
				};
				currentResource = sinon.stub(currentResource);

				selfUrl = '/rests/foo/self';
				urlResolveStub = sinon.stub();
				stubs['../express/Url'] = {
					resolve: urlResolveStub
				};
				restDescriptor = proxyquire('../rests/RestDescriptor', stubs);
			});

			describe('入口服务', function() {
				beforeEach(function() {
					desc = {
						type: 'entry'
					};
					restDescriptor.attach(app, currentResource, url, desc);
				});

				it('正确响应', function(done) {
					var expectedLinks = [
						{
							rel: 'rel1',
							href: '/href1'
						},
						{
							rel: 'rel2',
							href: '/href2'
						}
					];
					currentResource.getLinks.returns(Promise.resolve(expectedLinks));

					request.get(url).expect('Content-Type', 'application/vnd.hotex.com+json; charset=utf-8').expect(
						200,
						{
							links: expectedLinks
						},
						done
					);
				});

				it('未知错误返回500内部错', function(done) {
					currentResource.getLinks.returns(Promise.reject(err));
					request.get(url).expect(500, err, done);
				});
			});

			describe('查询服务', function() {
				var elementResourceId, reqQuery, searchStub, resultCollection;

				beforeEach(function() {
					reqQuery = {
						arg1: 'aaa',
						arg2: 'bbb'
					};
					elementResourceId = 'fuuuuuu';
					searchStub = sinon.stub();

					desc = {
						type: 'query',
						element: elementResourceId,
						handler: searchStub
					};

					restDescriptor.attach(app, currentResource, url, desc);
				});

				it('正确响应', function(done) {
					var queryStr = '?arg1=aaa&arg2=bbb';
					var element1 = {
						id: '001',
						foo: 'foo 1',
						fee: 'fee 1'
					};
					var element2 = {
						id: '002',
						foo: 'foo 2',
						fee: 'fee 2'
					};
					resultCollection = {
						items: [ element1, element2 ],
						perpage: 10,
						page: 1,
						total: 200
					};
					searchStub.withArgs(reqQuery).returns(Promise.resolve(resultCollection));

					var expectedLinks = [
						{
							rel: 'rel1',
							href: '/href1'
						},
						{
							rel: 'rel2',
							href: '/href2'
						}
					];
					currentResource.getLinks.callsFake(function(context, req) {
						expect(context).eql(resultCollection);
						expect(req.originalUrl).eql(url + queryStr);
						return Promise.resolve(expectedLinks);
					});

					var refElement1 = '/ref/element/001';
					var refElement2 = '/ref/element/002';
					currentResource.getTransitionUrl.callsFake(function(targetResourceId, context, req) {
						expect(targetResourceId).eql(elementResourceId);
						expect(req.originalUrl).eql(url + queryStr);
						var refurl;
						if (context === element1) refurl = refElement1;
						if (context === element2) refurl = refElement2;
						return refurl;
					});

					urlResolveStub.callsFake(function(req, urlArg) {
						expect(urlArg).eql(url + queryStr);
						return selfUrl;
					});
					restDescriptor = proxyquire('../rests/RestDescriptor', stubs);
					restDescriptor.attach(app, currentResource, url, desc);

					request
						.get(url)
						.query(reqQuery)
						.expect('Content-Type', 'application/vnd.hotex.com+json; charset=utf-8')
						.expect(
							200,
							{
								collection: {
									href: selfUrl,
									items: [
										{
											link: {
												rel: elementResourceId,
												href: refElement1
											},
											data: {
												foo: 'foo 1',
												fee: 'fee 1'
											}
										},
										{
											link: {
												rel: elementResourceId,
												href: refElement2
											},
											data: {
												foo: 'foo 2',
												fee: 'fee 2'
											}
										}
									],
									perpage: 10,
									page: 1,
									total: 200
								},
								links: expectedLinks
							},
							done
						);
				});

				it('未知错误返回500内部错', function(done) {
					err = 'any error ....';
					searchStub.returns(Promise.reject(err));
					request.get(url).expect(500, err, done);
				});
			});

			describe('创建资源服务', function() {
				var targetResourceId, reqBody, createStub, objCreated;
				beforeEach(function() {
					targetResourceId = 'fuuuuuu';
					createStub = sinon.stub();
					desc = {
						type: 'create',
						target: targetResourceId,
						handler: createStub
					};

					restDescriptor.attach(app, currentResource, url, desc);
				});

				it('正确响应', function(done) {
					reqBody = {
						foo: 'any request data used to create object'
					};
					objCreated = {
						__id: 'fooid',
						foo: 'foo',
						fee: 'fee'
					};
					createStub.withArgs(reqBody).returns(Promise.resolve(objCreated));

					var expectedLinks = [
						{
							rel: 'rel1',
							href: '/href1'
						},
						{
							rel: 'rel2',
							href: '/href2'
						}
					];
					currentResource.getLinks.callsFake(function(context, req) {
						expect(context).eql(objCreated);
						expect(req.originalUrl).eql(url);
						return Promise.resolve(expectedLinks);
					});
					var urlToCreatedObject = '/url/to/created/obj';
					currentResource.getTransitionUrl.callsFake(function(target, context, req) {
						expect(target).eql(targetResourceId);
						expect(context).eql(objCreated);
						expect(req.originalUrl).eql(url);
						return urlToCreatedObject;
					});

					request
						.post(url)
						.send(reqBody)
						.expect('Content-Type', 'application/vnd.hotex.com+json; charset=utf-8')
						.expect('Location', urlToCreatedObject)
						.expect(
							201,
							{
								href: urlToCreatedObject,
								fuuuuuu: objCreated,
								links: expectedLinks
							},
							done
						);
				});

				it('未知错误返回500内部错', function(done) {
					createStub.returns(Promise.reject(err));
					request.post(url).send(reqBody).expect(500, err, done);
				});
			});

			describe('读取资源状态服务', function() {
				var resourceId, handlerStub, objRead, version, modifiedDate;
				beforeEach(function() {
					resourceId = 'fuuuu';
					version = '123456';
					modifiedDate = new Date(2017, 10, 10).toJSON();
					handlerStub = sinon.stub();
					desc = {
						type: 'read',
						handler: handlerStub
					};
				});

				it('正确响应', function(done) {
					currentResource.getResourceId.returns(resourceId);

					objRead = {
						id: 'fooid',
						foo: 'foo',
						fee: 'fee',
						modifiedDate: modifiedDate,
						__v: version
					};
					handlerStub.returns(Promise.resolve(objRead));

					var expectedLinks = [
						{
							rel: 'rel1',
							href: '/href1'
						},
						{
							rel: 'rel2',
							href: '/href2'
						}
					];
					currentResource.getLinks.callsFake(function(context, req) {
						expect(context).eql(objRead);
						expect(req.originalUrl).eql(url);
						return Promise.resolve(expectedLinks);
					});

					var representedObject = Object.assign({}, objRead);
					representedObject.modifiedDate = modifiedDate;
					var representation = {
						href: selfUrl,
						links: expectedLinks
					};
					representation[resourceId] = representedObject;

					urlResolveStub.callsFake(function(req, urlArg) {
						expect(urlArg).eql(url);
						return selfUrl;
					});
					restDescriptor = proxyquire('../rests/RestDescriptor', stubs);
					restDescriptor.attach(app, currentResource, url, desc);

					request
						.get(url)
						.expect('Content-Type', 'application/vnd.hotex.com+json; charset=utf-8')
						.expect('ETag', version)
						.expect('Last-Modified', modifiedDate)
						.expect(200, representation, done);
				});

				it('未找到资源', function(done) {
					handlerStub.returns(Promise.reject('Not-Found'));
					restDescriptor.attach(app, currentResource, url, desc);
					request.get(url).expect(404, done);
				});

				it('未知错误返回500内部错', function(done) {
					handlerStub.returns(Promise.reject(err));
					restDescriptor.attach(app, currentResource, url, desc);
					request.get(url).expect(500, err, done);
				});
			});

			describe('更新服务', function() {
				var handler, id, version, body, doc, modifiedDate;
				beforeEach(function() {
					handler = sinon.stub({
						condition: function(id, version) {},
						handle: function(doc, body) {}
					});
					desc = {
						type: 'update',
						handler: handler
					};
					url = '/url/:id';
					id = 'foo';
					version = '12345df';
					modifiedDate = new Date(2017, 11, 11);
					body = {
						body: 'any data to update'
					};
					doc = {
						doc: 'doc identified by id'
					};
					restDescriptor.attach(app, currentResource, url, desc);
				});

				it('请求中未包含条件', function(done) {
					desc.conditional = true;
					request.put('/url/' + id).expect(403, 'client must send a conditional request', done);
				});

				it('不满足请求条件', function(done) {
					handler.condition.withArgs(id, version).returns(Promise.resolve(false));
					request.put('/url/' + id).set('If-Match', version).expect(412, done);
				});

				it('满足请求条件, 但handle未返回任何资源最新状态控制信息', function(done) {
					handler.condition.withArgs(id, version).returns(Promise.resolve(true));
					err = 'handler did not promise any state version info ....';
					handler.handle.withArgs(id, body).returns(Promise.resolve({}));
					request.put('/url/' + id).set('If-Match', version).send(body).expect(500, err, done);
				});

				it('满足请求条件, 并正确响应', function(done) {
					handler.condition.withArgs(id, version).returns(Promise.resolve(true));
					handler.handle.returns(
						Promise.resolve({
							__v: version,
							modifiedDate: modifiedDate
						})
					);
					request
						.put('/url/' + id)
						.set('If-Match', version)
						.send(body)
						.expect('ETag', version)
						.expect('Last-Modified', modifiedDate.toJSON())
						.expect(204, done);
				});

				it('未找到文档', function(done) {
					var reason = 'Not-Found';
					handler.handle.withArgs(id, body).returns(Promise.reject(reason));
					request.put('/url/' + id).send(body).expect(404, done);
				});

				it('文档状态不一致', function(done) {
					var reason = 'Concurrent-Conflict';
					handler.handle.withArgs(id, body).returns(Promise.reject(reason));
					request.put('/url/' + id).send(body).expect(304, done);
				});

				it('无新的评审内容需要更新', function(done) {
					var reason = 'Nothing';
					handler.handle.withArgs(id, body).returns(Promise.reject(reason));
					request.put('/url/' + id).send(body).expect(204, done);
				});

				it('响应更新失败', function(done) {
					var reason = 'conflict';
					desc.response = {
						conflict: {
							code: 409,
							err: 'here is the cause'
						}
					};
					handler.handle.withArgs(id, body).returns(Promise.reject(reason));
					request.put('/url/' + id).send(body).expect(409, 'here is the cause', done);
				});

				it('无请求条件, 正确响应', function(done) {
					handler.handle.withArgs(id, body).returns(
						Promise.resolve({
							__v: version,
							modifiedDate: modifiedDate
						})
					);
					request
						.put('/url/' + id)
						.send(body)
						.expect('ETag', version)
						.expect('Last-Modified', modifiedDate.toJSON())
						.expect(204, done);
				});

				it('未能识别的错误返回500内部错', function(done) {
					err = 'foo';
					handler.handle.returns(Promise.reject(err));
					request.put(url).expect(500, err, done);
				});
			});

			describe('删除服务', function() {
				var handler, id, version;
				beforeEach(function() {
					handler = sinon.stub({
						condition: function(id, version) {},
						handle: function(id, version) {}
					});
					desc = {
						type: 'delete',
						handler: handler
					};
					url = '/url/:id';
					id = 'foo';
					version = '12345df';
					restDescriptor.attach(app, currentResource, url, desc);
				});

				it('请求中未包含条件', function(done) {
					desc.conditional = true;
					request.delete('/url/' + id).expect(403, 'client must send a conditional request', done);
				});

				it('不满足请求条件', function(done) {
					handler.condition.withArgs(id, version).returns(Promise.resolve(false));
					request.delete('/url/' + id).set('If-Match', version).expect(412, done);
				});

				it('满足请求条件, 但handle处理失败', function(done) {
					var reason = 'conflict';
					err = 'details of conflicts';
					desc.response = {
						conflict: {
							code: 409,
							err: err
						}
					};
					handler.condition.withArgs(id, version).returns(Promise.resolve(true));
					handler.handle.withArgs(id, version).returns(Promise.reject(reason));
					request.delete('/url/' + id).set('If-Match', version).expect(409, err, done);
				});

				it('满足请求条件, 并正确响应', function(done) {
					handler.condition.withArgs(id, version).returns(Promise.resolve(true));
					handler.handle.returns(Promise.resolve());
					request.delete('/url/' + id).set('If-Match', version).expect(204, done);
				});

				it('未找到文档', function(done) {
					var reason = 'Not-Found';
					handler.handle.withArgs(id).returns(Promise.reject(reason));
					request.delete('/url/' + id).expect(404, done);
				});

				it('正确响应', function(done) {
					handler.handle.withArgs(id).returns(Promise.resolve());
					request.delete('/url/' + id).expect(204, done);
				});

				it('响应删除失败', function(done) {
					var reason = 'conflict';
					err = 'details of conflicts';
					desc.response = {
						conflict: {
							code: 409
						}
					};
					// TODO:对于在服务定义中定义的出错处理应重构
					handler.handle.withArgs(id).returns(Promise.reject(reason));
					request.delete('/url/' + id).expect(409, reason, done);
				});

				it('未能识别的错误返回500内部错', function(done) {
					err = 'foo';
					handler.handle.withArgs(id).returns(Promise.reject(err));
					request.delete('/url/' + id).expect(500, err, done);
				});
			});
		});

		describe('对资源描述的解析', function() {
			var request, router, handler, url;
			var desc, restDesc, resourceId;
			var resourceRegistry, attachSpy;
			var dataToRepresent;

			beforeEach(function() {
				resourceId = 'foo';
				dataToRepresent = {
					data: 'any data'
				};
				router = require('express')();
				request = require('supertest')(router);
				url = '/rests/foo';
				handler = function(req, res) {
					return dataToRepresent;
				};

				restDesc = {
					rest: 'any rest descriptor'
				};

				desc = {
					url: url,
					rests: [ restDesc ]
				};

				attachSpy = sinon.spy();
				stubs['./RestDescriptor'] = {
					attach: attachSpy
				};
				resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);
			});

			it('一个资源应具有寻址性，必须定义url模板', function() {
				delete desc.url;
				expect(function() {
					resourceRegistry.attach(router, resourceId, desc);
				}).throw('a url must be defined!');
			});

			it('提供当前资源标识', function() {
				var resource = resourceRegistry.attach(router, 'foo', desc);
				expect(resource.getResourceId()).eql('foo');
			});

			describe('构建当前资源的URL', function() {
				var fromResourceId, context, req;
				var resource;
				var expectedUrl, urlResolveStub;

				beforeEach(function() {
					fromResourceId = 'fff';
					context = {};
					req = {
						params: {},
						query: {}
					};

					expectedUrl = '/expected/url';
					urlResolveStub = sinon.stub();
					stubs['../express/Url'] = {
						resolve: urlResolveStub
					};
				});

				it('无路径变量', function() {
					urlResolveStub.withArgs(req, url).returns(expectedUrl);
					resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

					resource = resourceRegistry.attach(router, resourceId, desc);
					expect(resource.getUrl(fromResourceId, context, req)).eql(expectedUrl);
				});

				it('未定义迁移，缺省方式从上下文中取同路径变量名相同的属性值', function() {
					desc.url = '/url/:arg1/and/:arg2/and/:arg3';
					context.arg3 = '1234';
					req.params.arg2 = '3456';
					req.query.arg1 = '5678';

					urlResolveStub.withArgs(req, '/url/5678/and/3456/and/1234').returns(expectedUrl);
					resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

					resource = resourceRegistry.attach(router, resourceId, desc);
					expect(resource.getUrl(fromResourceId, context, req)).eql(expectedUrl);
				});

				it('通过定义迁移指定路径变量的取值', function() {
					desc.transitions = {};
					desc.transitions[fromResourceId] = {
						arg1: 'query.foo',
						arg2: 'params.foo',
						arg3: 'context.foo'
					};
					desc.url = '/url/:arg1/and/:arg2/and/:arg3/and/:arg4';
					context.foo = '1234';
					context.arg4 = '9876';
					req.params.foo = '3456';
					req.query.foo = '5678';

					urlResolveStub.withArgs(req, '/url/5678/and/3456/and/1234/and/9876').returns(expectedUrl);
					resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

					resource = resourceRegistry.attach(router, resourceId, desc);
					expect(resource.getUrl(fromResourceId, context, req)).eql(expectedUrl);
				});
			});

			it('构建从一个资源迁移到另一个资源的URL', function() {
				var fooDesc = {
					url: '/url/foo',
					rests: [ restDesc ]
				};
				var feeDesc = {
					url: '/url/fee',
					rests: [ restDesc ]
				};

				var req = {
					params: {},
					query: {}
				};

				var expectedUrl = '/expected/url';
				var urlResolveStub = sinon.stub();
				urlResolveStub.withArgs(req, '/url/fee').returns(expectedUrl);
				stubs['../express/Url'] = {
					resolve: urlResolveStub
				};
				resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

				var fooResource = resourceRegistry.attach(router, 'foo', fooDesc);
				resourceRegistry.attach(router, 'fee', fooDesc);
				resourceRegistry.attach(router, 'fee', feeDesc);
				resourceRegistry.getTransitionUrl('foo', 'fee', context, req);
			});

			it('获得当前资源状态下的迁移链接列表', function() {
				var req = {
					reg: 'any request'
				};
				var context = {
					context: 'any context'
				};
				var links = [
					{
						rel: 'foo',
						href: '/foo'
					},
					{
						rel: 'fee',
						href: '/fee'
					}
				];
				var getLinksStub = createPromiseStub([ resourceId, context, req ], [ links ]);

				resourceRegistry = require('../rests/ResourceRegistry');
				resourceRegistry.setTransitionGraph({
					getLinks: getLinksStub
				});
				var resource = resourceRegistry.attach(router, resourceId, desc);

				return resource.getLinks(context, req).then(function(data) {
					expect(data).eql(links);
				});
			});

			it('资源定义错：未定义任何rest服务', function() {
				delete desc.rests;
				expect(function() {
					resourceRegistry.attach(router, resourceId, desc);
				}).throw('no restful service is defined!');
			});

			it('资源定义错：未定义任何rest服务', function() {
				desc.rests = [];
				expect(function() {
					resourceRegistry.attach(router, resourceId, desc);
				}).throw('no restful service is defined!');
			});

			it('加载资源时将导致该资源的所有服务被加载', function() {
				var attachSpy = sinon.spy();
				stubs['./RestDescriptor'] = {
					attach: attachSpy
				};
				resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

				var resource = resourceRegistry.attach(router, resourceId, desc);
				expect(attachSpy).calledWith(router, resource, url, restDesc);
			});
		});

		describe('基本的资源状态迁移图解析器', function() {
			var context, req, transitionGraph;
			var fooUrl, feeUrl;
			var getTransitionUrlStub, transitionGraphFactory, transitionGraphParser;
			var transCondStub;

			beforeEach(function() {
				context = {
					context: 'any context'
				};
				req = {
					req: 'any request object'
				};
				transitionGraph = {
					resource1: {
						rel1: 'foo',
						rel2: 'fee'
					},
					resource2: {
						rel3: 'fuu'
					}
				};

				fooUrl = '/url/foo';
				feeUrl = '/url/fee';
				getTransitionUrlStub = sinon.stub();
				getTransitionUrlStub.withArgs('resource1', 'foo', context, req).returns(fooUrl);
				getTransitionUrlStub.withArgs('resource1', 'fee', context, req).returns(feeUrl);

				transitionGraphFactory = require('../rests/BaseTransitionGraph');
				transitionGraphParser = transitionGraphFactory(transitionGraph, {
					getTransitionUrl: getTransitionUrlStub
				});
				transCondStub = sinon.stub();
			});

			it('最简单的迁移定义', function() {
				return transitionGraphParser.getLinks('resource1', context, req).then(function(data) {
					expect(data).eql([
						{
							rel: 'rel1',
							href: fooUrl
						},
						{
							rel: 'rel2',
							href: feeUrl
						}
					]);
				});
			});

			it('以对象表达迁移', function() {
				transCondStub.withArgs(context, req).returns(false);
				transitionGraph.resource1.rel2 = {
					id: 'fee'
				};

				return transitionGraphParser.getLinks('resource1', context, req).then(function(data) {
					expect(data).eql([
						{
							rel: 'rel1',
							href: fooUrl
						},
						{
							rel: 'rel2',
							href: feeUrl
						}
					]);
				});
			});

			it('未满足迁移条件', function() {
				transCondStub.withArgs(context, req).returns(false);
				transitionGraph.resource1.rel2 = {
					id: 'fee',
					condition: transCondStub
				};

				return transitionGraphParser.getLinks('resource1', context, req).then(function(data) {
					expect(data).eql([
						{
							rel: 'rel1',
							href: fooUrl
						}
					]);
				});
			});

			it('满足迁移条件', function() {
				transCondStub.withArgs(context, req).returns(true);
				transitionGraph.resource1.rel2 = {
					id: 'fee',
					condition: transCondStub
				};

				return transitionGraphParser.getLinks('resource1', context, req).then(function(data) {
					expect(data).eql([
						{
							rel: 'rel1',
							href: fooUrl
						},
						{
							rel: 'rel2',
							href: feeUrl
						}
					]);
				});
			});
		});
	});

	describe('基于express实现', function() {
		describe('组装完整的URL', function() {
			var protocol, getHostStub, reqStub, URL;

			beforeEach(function() {
				protocol = 'http';
				getHostStub = sinon.stub();
				reqStub = {
					protocol: protocol,
					get: getHostStub
				};
				URL = require('../express/Url');
			});

			it('包含端口号', function() {
				getHostStub.withArgs('host').returns('www.hotex.com:2341');
				expect(URL.resolve(reqStub, '/rest/foo')).eql('http://www.hotex.com:2341/rest/foo');
			});

			it('应省略HTTP下的80端口号', function() {
				getHostStub.withArgs('host').returns('www.hotex.com:80');
				expect(URL.resolve(reqStub, '/rest/foo')).eql('http://www.hotex.com/rest/foo');
			});
		});

		describe('开发人员可以加载handlebars View engine', function() {
			var viewsDir, viewEngineName, viewEngine, expressApp, appMock;
			var handlebarsEngineCreatorStub;
			var viewsEngineFactory;

			beforeEach(function() {
				viewsDir = '/views/dir';
				viewEngineName = 'foo-engine';
				viewEngine = {};
				expressApp = require('express')();
				appMock = sinon.mock(expressApp);
				appMock.expects('set').withExactArgs('views', viewsDir).once();
				appMock.expects('engine').withExactArgs(viewEngineName, viewEngine).once();
				appMock.expects('set').withExactArgs('view engine', viewEngineName).once();

				handlebarsEngineCreatorStub = sinon.stub();
			});

			it('缺省配置', function() {
				handlebarsEngineCreatorStub
					.withArgs({
						partialsDir: viewsDir + '/partials',
						extname: '.' + viewEngineName
					})
					.returns({
						engine: viewEngine
					});
				stubs['express-handlebars'] = {
					create: handlebarsEngineCreatorStub
				};

				viewsEngineFactory = proxyquire('../express/HandlebarsFactory', stubs)(viewEngineName, viewsDir);
				viewsEngineFactory.attachTo(expressApp);
				appMock.verify();
			});

			it('设置view partials目录', function() {
				var partialsDir = '/partials/dir';
				handlebarsEngineCreatorStub
					.withArgs({
						partialsDir: partialsDir,
						extname: '.' + viewEngineName
					})
					.returns({
						engine: viewEngine
					});
				stubs['express-handlebars'] = {
					create: handlebarsEngineCreatorStub
				};

				viewsEngineFactory = proxyquire('../express/HandlebarsFactory', stubs)(viewEngineName, viewsDir, {
					partialsDir: partialsDir
				});
				viewsEngineFactory.attachTo(expressApp);
				appMock.verify();
			});

			it('设置view文件扩展名', function() {
				var extname = '.handlebars';
				handlebarsEngineCreatorStub
					.withArgs({
						partialsDir: viewsDir + '/partials',
						extname: extname
					})
					.returns({
						engine: viewEngine
					});
				stubs['express-handlebars'] = {
					create: handlebarsEngineCreatorStub
				};

				viewsEngineFactory = proxyquire('../express/HandlebarsFactory', stubs)(viewEngineName, viewsDir, {
					extname: extname
				});
				viewsEngineFactory.attachTo(expressApp);
				appMock.verify();
			});

			it('设置helpers', function() {
				var helpers = {};
				handlebarsEngineCreatorStub
					.withArgs({
						partialsDir: viewsDir + '/partials',
						extname: '.' + viewEngineName,
						helpers: helpers
					})
					.returns({
						engine: viewEngine
					});
				stubs['express-handlebars'] = {
					create: handlebarsEngineCreatorStub
				};

				viewsEngineFactory = proxyquire('../express/HandlebarsFactory', stubs)(viewEngineName, viewsDir, {
					helpers: helpers
				});
				viewsEngineFactory.attachTo(expressApp);
				appMock.verify();
			});
		});

		describe('AppBuilder', function() {
			var appBaseDir, appBuilder;

			beforeEach(function() {
				appBaseDir = __dirname;
				appBuilder = require('../express/AppBuilder').begin(appBaseDir);
			});

			it('设置网站根目录', function(done) {
				var requestAgent = require('supertest');
				var app = appBuilder.setWebRoot('/app', './data/website').end().getApp();
				var request = requestAgent(app);
				request.get('/app/staticResource.json').expect(
					200,
					{
						name: 'foo'
					},
					done
				);
			});

			it('开发人员可以加载handlebars View engine', function() {
				var loadSpy = sinon.spy();
				var app = appBuilder
					.setViewEngine({
						attachTo: loadSpy
					})
					.end()
					.getApp();
				expect(loadSpy).calledWith(app).calledOnce;
			});

			it('开发人员可以加载Auth2', function() {
				var auth2 = {
					attachTo: sinon.spy()
				};
				var app = appBuilder.getApp();
				appBuilder.setAuth2(auth2).end();
				expect(auth2.attachTo).calledWith(app).calledOnce;
			});

			it('开发人员可以加载Rest服务', function() {
				var attachSpy = sinon.spy();
				var resourceRegistry = {
					attach: attachSpy
				};

				var fooResourceDesc = {
					foo: 'foo resource desc'
				};
				var feeResourceDesc = {
					fee: 'fee resource desc'
				};
				var resources = {
					foo: fooResourceDesc,
					fee: feeResourceDesc
				};

				var app = appBuilder.setResources(resourceRegistry, resources).end().getApp();

				expect(attachSpy).calledWith(app, 'foo', fooResourceDesc);
				expect(attachSpy).calledWith(app, 'fee', feeResourceDesc);
			});

			describe('运行服务器', function() {
				const superagent = require('superagent');
				var server, port;

				beforeEach(function(done) {
					port = 3301;
					appBuilder.setWebRoot('/', './data/website');
					done();
				});

				afterEach(function(done) {
					server.close(function() {
						console.log('and now the server is stoped!');
						done();
					});
				});

				function runAndCheckServer(url, done) {
					server = appBuilder.run(function() {
						superagent.get(url).end(function(e, res) {
							expect(e).eql(null);
							expect(res.body.name).eql('foo');
							done();
						});
					});
				}

				it('运行一个缺省的Server', function(done) {
					process.env.PORT = 80;
					runAndCheckServer('http://localhost/staticResource.json', done);
				});

				it('系统管理员可以通过设置Node.js运行环境变量设定端口号', function(done) {
					process.env.PORT = port;
					runAndCheckServer('http://localhost:' + port + '/staticResource.json', done);
				});
			});
		});
	});

	xdescribe('生命周期', function() {
		var lifecycleFactory, stateRepositoryStub;
		var fsm, lifecycle, event, source, data, handlerSpy, currentState;
		beforeEach(function() {
			stateRepositoryStub = sinon.stub({
				init: function(source, state) {},
				current: function(source) {},
				update: function(source, state) {}
			});
			lifecycleFactory = require('../app/Lifecycle')(stateRepositoryStub);

			handlerSpy = sinon.spy();
			currentState = 'draft';
			source = 'foo';
			data = {
				data: 'any data'
			};
			event = {
				source: source,
				data: data
			};
		});

		it('进入生命周期', function() {
			fsm = {
				init: 's1'
			};
			lifecycle = lifecycleFactory.create(fsm);
			stateRepositoryStub.init.withArgs(source, 's1').returns(Promise.resolve(fsm.init));
			return lifecycle.entry(source).then(function(value) {
				expect(value).eql(fsm.init);
			});
		});

		it('接受当前事件, 保持状态不变', function() {
			fsm = {
				transitions: [
					{
						name: 'modify',
						from: 'draft',
						to: 'draft'
					}
				],
				methods: {
					onModify: handlerSpy
				}
			};
			lifecycle = lifecycleFactory.create(fsm);

			event.name = 'modify';
			stateRepositoryStub.current.withArgs(source).returns(Promise.resolve('draft'));
			return lifecycle.dealWith(event).then(function() {
				expect(handlerSpy).calledWith(source, data).calledOnce;
			});
		});

		it('接受当前事件, 状态发生迁移', function() {
			fsm = {
				transitions: [
					{
						name: 'submit',
						from: 'draft',
						to: 'reviewing'
					}
				],
				methods: {
					onSubmit: handlerSpy
				}
			};
			lifecycle = lifecycleFactory.create(fsm);

			event.name = 'submit';
			stateRepositoryStub.current.withArgs(source).returns(Promise.resolve('draft'));
			stateRepositoryStub.update = sinon.spy();
			return lifecycle.dealWith(event).then(function() {
				// TODO:是否需要考虑调用次序？
				expect(handlerSpy).calledWith(source, data).calledOnce;
				expect(stateRepositoryStub.update).calledWith(source, 'reviewing').calledOnce;
			});
		});
	});
});
