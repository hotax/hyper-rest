/**
 * Created by clx on 2017/10/9.
 */
var proxyquire = require('proxyquire'),
    path = require('path'),
    toUtc = require('../utils/UtcDate').toUtc,
    mongoose = require('mongoose'),
    moment = require('moment'),
    Schema = mongoose.Schema;

describe('hyper-rest', function () {
    var func, stubs, err, reason, createReasonMock;
    beforeEach(function () {
        stubs = {};
        err = new Error('any error message');
        reason = {
            reason: 'any reason representing any error'
        }
        createReasonMock = {
            createErrorReason: sinon.stub()
        };
    });

    describe('出错原因', function () {
        var createErrorReason, code, msg;
        var res, statusMock, sendMock;
        beforeEach(function () {
            createErrorReason = require('../app/CreateErrorReason');
            res = {
                status: sinon.spy(),
                send: sinon.spy()
            }
        });

        it('可设置express响应', function () {
            code = 404;
            msg = "foo msg";
            var reason = createErrorReason(code, msg);
            reason.sendStatusTo(res);
            expect(res.status.calledWith(code))
            expect(res.send.calledWith(msg))
        })
    });

    describe('同数据库相关部件', function () {
        it('开发人员可以通过mongoose使应用连接到mongoDb数据库', function () {
            process.env.MONGODB = 'mongodb://localhost:27017/test';
            var connectDb = require('../db/mongoDb/ConnectMongoDb');
            connectDb(function () {
            });
        });

        xdescribe('createObjectId', function () {

            it('非法标识', function () {
                createReasonMock.createErrorReason.returns(reason);
                stubs['../../app'] = createReasonMock;
                func = proxyquire('../db/mongoDb/CreateObjectId', stubs);
                return func('1234')
                    .then(function () {
                        throw 'failed';
                    })
                    .catch(function (err) {
                        expect(reason).eqls(err);
                    })
            });

            it('合法标识', function () {
                func = require('../db/mongoDb/CreateObjectId');
                return func('5ac0c25b0f72e70cd9d065b0')
                    .then(function (data) {
                        expect(data).eqls(require('mongodb').ObjectID('5ac0c25b0f72e70cd9d065b0'));
                    })
            });

            it('仅仅检查合法性不转化为ObjectId', function () {
                func = require('../db/mongoDb/CreateObjectId');
                return func('5ac0c25b0f72e70cd9d065b0', false)
                    .then(function (data) {
                        expect(data).eqls('5ac0c25b0f72e70cd9d065b0');
                    })
            })
        });

        describe('分页查询工厂', function () {
            var execStub, Schema, SchemaMock, paginatingQuery;
            var dbdata, countNum, expectedData;
            var options;

            beforeEach(function () {
                execStub = sinon.stub();
                Schema = {
                    find: function () {},
                    select: function () {},
                    limit: function () {},
                    skip: function () {},
                    sort: function () {},
                    count: function () {},
                    exec: execStub
                };
                SchemaMock = sinon.mock(Schema);

                dbdata = [{
                    data: 'foo'
                }, {
                    data: 'fee'
                }];
                countNum = 300;
                expectedData = {
                    items: dbdata,
                    total: countNum,
                    page: 1,
                    perpage: 10
                }

                execStub.returns(Promise.resolve(dbdata));
                execStub.onCall(0).returns(Promise.resolve(dbdata));
                execStub.onCall(1).returns(Promise.resolve(countNum));

                SchemaMock.expects('count').withArgs().once().returns(Schema);
                paginatingQuery = require('../db/mongoDb/PaginatingQuery');

                options = {
                    schema: Schema
                }
            });

            it('未指定查询选项', function () {
                expect(function () {
                    paginatingQuery.query();
                }).throw('a query options with db schema should be given');
            });

            it('未指定查询集合', function () {
                expect(function () {
                    paginatingQuery.query({});
                }).throw('a query options with db schema should be given');
            });

            it('查询指定集合', function (done) {
                SchemaMock.expects('find').withArgs({}).once().returns(Schema);
                SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
                SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

                paginatingQuery.query(options)
                    .then(function (data) {
                        expect(data).eql(expectedData);
                        SchemaMock.verify();
                        done();
                    })
            });

            it('指定查询条件', function (done) {
                var queryconditions = {
                    conditions: 'any query conditions'
                };
                SchemaMock.expects('find').withArgs(queryconditions).once().returns(Schema);
                SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
                SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

                options.conditions = queryconditions;
                paginatingQuery.query(options)
                    .then(function (data) {
                        expect(data).eql(expectedData);
                        SchemaMock.verify();
                        done();
                    })
            });

            it('指定查询输出字段', function (done) {
                var select = 'f1 f2';
                SchemaMock.expects('select').withArgs(select).once().returns(Schema);
                SchemaMock.expects('find').withArgs({}).once().returns(Schema);
                SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
                SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

                options.select = select;
                paginatingQuery.query(options)
                    .then(function (data) {
                        expect(data).eql(expectedData);
                        SchemaMock.verify();
                        done();
                    })
            });

            it('指定每页记录数', function (done) {
                var perpage = 5;
                SchemaMock.expects('find').withArgs({}).once().returns(Schema);
                SchemaMock.expects('limit').withArgs(perpage).once().returns(Schema);
                SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

                options.perpage = perpage;
                expectedData.perpage = perpage;
                paginatingQuery.query(options)
                    .then(function (data) {
                        expect(data).eql(expectedData);
                        SchemaMock.verify();
                        done();
                    })
            });

            it('指定当前页', function (done) {
                var page = 3;
                SchemaMock.expects('find').withArgs({}).once().returns(Schema);
                SchemaMock.expects('limit').withArgs().once().returns(Schema);
                SchemaMock.expects('skip').withArgs(20).once().returns(Schema);

                options.page = page;
                expectedData.page = page;

                paginatingQuery.query(options)
                    .then(function (data) {
                        expect(data).eql(expectedData);
                        SchemaMock.verify();
                        done();
                    })
            });

            it('指定数据库返回数组中各项数据元素的处理方法', function (done) {
                SchemaMock.expects('find').withArgs({}).once().returns(Schema);
                SchemaMock.expects('limit').withArgs(10).once().returns(Schema);
                SchemaMock.expects('skip').withArgs(0).once().returns(Schema);

                var dataHandleStub = sinon.stub();
                dataHandleStub.withArgs(dbdata[0]).returns('foo');
                dataHandleStub.withArgs(dbdata[1]).returns('fee');

                options.handler = dataHandleStub;
                paginatingQuery.query(options)
                    .then(function (data) {
                        expect(data).eql({
                            items: ['foo', 'fee'],
                            total: countNum,
                            page: 1,
                            perpage: 10
                        });
                        SchemaMock.verify();
                        done();
                    })
            })
        });
    });

    describe('Restful', function () {
        describe('MapContextToUrlParams', () => {
            const createMapContextToUrlParams = require('../rests/MapContextToUrlParams'),
            resourceId = 'foo'
            let mapContextToUrlParams, context, req, map

            beforeEach(() => {
                map = {}
                context = {}
                req = {
                    params: {},
                    query: {}
                }
                mapContextToUrlParams = createMapContextToUrlParams(map)
            })

            it('未给出变量映射表', () => {
                mapContextToUrlParams = createMapContextToUrlParams()
                expect(mapContextToUrlParams.toParams(resourceId, req, context)).eql({})
            })

            it('指定资源未给出变量映射表', () => {
                expect(mapContextToUrlParams.toParams(resourceId, req, context)).eql({})
            })

            it('路径变量映射', () => {
                const foo = 'foo',
                fee = 'fee',
                fuu = 'fuu'
                req.params = {foo}
                req.query = {fee}
                context = {fuu}
                map[resourceId] = {foo: 'params.foo', fee: 'query.fee', fuu: 'context.fuu'}
                expect(mapContextToUrlParams.toParams(resourceId, req, context)).eql({
                    foo, fee, fuu
                })
            })

            it('路径变量引用', () => {
                const refkey = 'fuu'
                map[resourceId] = {foo: 'params.foo', fee: 'query.fee'}
                map[resourceId][refkey] = 'context'
                const rtn = mapContextToUrlParams.getRefKey(resourceId)
                expect(rtn).eql(refkey)
            })
        })

        describe('CtxUrlRefParser', () => {
            const req = { req: 'http request' },
            refKey = 'refkey',
            constParams = {v: 'const params pairs'}
            let urlPatternToPath, parserBuilder, parser, ctx

            beforeEach(() => {
                ctx = {}
                urlPatternToPath = sinon.stub(),
                parserBuilder = require('../rests/CtxUrlRefParser')(urlPatternToPath),
                parser = parserBuilder(req, refKey, constParams)
            })

            it('单个属性', () => {
                const expectedUrl = '/rest/url/expected',
                fldName = 'fooFld',
                fldVal = 'fooFldVal',
                urlParams = {...constParams}

                ctx[fldName] = fldVal
                urlParams[refKey] = fldVal
                urlPatternToPath.withArgs(req, urlParams).returns(expectedUrl)

                parser.refUrl(ctx, fldName)
                expect(ctx[fldName]).eql(expectedUrl)
            })

            it('单个属性-上下文无知无值', () => {
                fldName = 'fooFld',
                urlParams = {...constParams}
                urlPatternToPath = sinon.spy()
                parserBuilder = require('../rests/CtxUrlRefParser')(urlPatternToPath),
                parser = parserBuilder(req, refKey, constParams)
                
                parser.refUrl(ctx, fldName)
                expect(ctx[fldName]).undefined
                expect(urlPatternToPath.notCalled).true
            })

            it('子文档属性', () => {
                const expectedUrl = '/rest/url/expected',
                fldName = 'fooFld',
                fldVal = 'fooFldVal',
                urlParams = {...constParams}

                ctx.foo = {fee: {}}
                ctx.foo.fee[fldName] = fldVal
                urlParams[refKey] = fldVal
                urlPatternToPath.withArgs(req, urlParams).returns(expectedUrl)

                parser.refUrl(ctx, `foo.fee.${fldName}`)
                expect(ctx).eql({foo: {fee: {fooFld: expectedUrl}}})
            })

            it('子文档数组属性', () => {
                const fooUrl = '/foo',
                feeUrl = '/fee',
                fooVal = 'fooVal',
                feeVal = 'feeVal',
                fooUrlParams = {...constParams},
                feeUrlParams = {...constParams}

                fooUrlParams[refKey] = fooVal
                feeUrlParams[refKey] = feeVal
                ctx.flds = [{fld: fooVal}, {fld: feeVal}]
                urlPatternToPath.withArgs(req, fooUrlParams).returns(fooUrl)
                urlPatternToPath.withArgs(req, feeUrlParams).returns(feeUrl)

                parser.refUrl(ctx, 'flds.fld')
                expect(ctx).eql({
                    flds: [{fld: fooUrl}, {fld: feeUrl}]
                })
            })

            it('多个属性', () => {
                const fooUrl = '/foo',
                feeUrl = '/fee',
                fooFldName = 'fooFld',
                fooFldVal = 'fooFldVal',
                feeFldName = 'feeFld',
                feeFldVal = 'feeFldVal',
                fooUrlParams = {...constParams},
                feeUrlParams = {...constParams}

                fooUrlParams[refKey] = fooFldVal
                feeUrlParams[refKey] = feeFldVal
                ctx[fooFldName] = fooFldVal
                ctx[feeFldName] = feeFldVal
                urlPatternToPath.withArgs(req, fooUrlParams).returns(fooUrl)
                urlPatternToPath.withArgs(req, feeUrlParams).returns(feeUrl)

                parser.refUrl(ctx, [fooFldName, feeFldName])
                expect(ctx[fooFldName]).eql(fooUrl)
                expect(ctx[feeFldName]).eql(feeUrl)
            })
        })

        describe('UrlBuilder', () => {
            const urlTemplate = '/rest/:foo/sec1',
                paramVal = 'paramVal',
                expectedUrl = '/rest/' + paramVal + '/sec1',
                resourceId = 'fooid',
                context = {
                    context: 'any data of context'
                },
                req = {
                    params: {},
                    query: {}
                },
                resourceUrlParamsMap = {};
            let createUrlBuilder, urlBuilder

            beforeEach(() => {
                createUrlBuilder = require('../rests/UrlBuilder')()
                urlBuilder = createUrlBuilder(urlTemplate, resourceUrlParamsMap)
            })

            describe('上下文引用URL', () => {
                it('单个属性', () => {
                    context.fldVal = paramVal
                    resourceUrlParamsMap[resourceId] = {
                        foo: 'context'
                    }
                    urlBuilder.refUrl(resourceId, context, req, 'fldVal')
                    expect(context.fldVal).eql(expectedUrl)
                })

                it('多个属性', () => {
                    context.foofld = 'foo'
                    context.feefld = 'fee'
                    resourceUrlParamsMap[resourceId] = {
                        foo: 'context'
                    }
                    urlBuilder.refUrl(resourceId, context, req, ['foofld', 'feefld'])
                    expect(context.foofld).eql('/rest/foo/sec1')
                    expect(context.feefld).eql('/rest/fee/sec1')
                })
            })

            it('无变量Url', () => {
                const url = '/rest/foo/sec'
                urlBuilder = createUrlBuilder(url)
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(url)
            })

            it('可以指定一个完整URL解析器', () => {
                const url = '/rest/foo/sec'
                const urlResolver = sinon.stub()
                urlResolver.withArgs(req, url).returns(expectedUrl)
                createUrlBuilder = require('../rests/UrlBuilder')(urlResolver)
                urlBuilder = createUrlBuilder(url)
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(expectedUrl)
            })

            it('变量在上下文中', () => {
                context.foo = paramVal
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(expectedUrl)
            })

            it('变量在请求变量中', () => {
                req.params.foo = paramVal
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(expectedUrl)
            })

            it('变量在请求查询变量中', () => {
                req.query.foo = paramVal
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(expectedUrl)
            })

            it('指定变量取值为上下文属性值', () => {
                context.fldVal = paramVal
                resourceUrlParamsMap[resourceId] = {
                    foo: 'context.fldVal'
                }
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(expectedUrl)
            })

            it('指定变量取值为请求变量值', () => {
                req.params.fldVal = paramVal
                resourceUrlParamsMap[resourceId] = {
                    foo: 'params.fldVal'
                }
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(expectedUrl)
            })

            it('指定变量取值为请求查询变量值', () => {
                req.query.fldVal = paramVal
                resourceUrlParamsMap[resourceId] = {
                    foo: 'query.fldVal'
                }
                expect(urlBuilder.getUrl(resourceId, context, req)).eql(expectedUrl)
            })
        })

        describe('CacheControlParser', () => {
            const parser = require('../rests/CacheControlParser'),
                control = 'no-store no-cache public private'

            it('设置控制', () => {
                expect(parser({
                    control
                })).eql(control)
            })

            it('设置max-age', () => {
                expect(parser({
                    maxAge: 31536000
                })).eql('max-age=31536000')
            })

            it('设置控制和max-age', () => {
                expect(parser({
                    control,
                    maxAge: 31536000
                })).eql(control + ' max-age=31536000')
            })
        })

        describe('基于目录内资源描述文件的资源加载器', function () {
            const restLoader = require('../rests/DirectoryResourceDescriptorsLoader');
            let descDir, loader;

            beforeEach(function () {
                descDir = path.join(__dirname, './data/rests');
            });

            it('指定的资源目录不存在', function () {
                descDir = path.join(__dirname, './data/fff');
                expect(() => restLoader(descDir)).to.throw();
            });

            it('加载一个资源描述', function () {
                loader = restLoader(descDir);
                var fooDesc = require('./data/rests/foo');
                expect(loader.loadAll()).eql({
                    foo: fooDesc
                });
            });
        })

        describe("基本的资源状态迁移图解析器", function () {
            const context = {
                    context: 'any context object'
                },
                req = {
                    req: 'the web request'
                },
                graph = {
                    resource1: {
                        rel1: "foo",
                        rel2: "fee"
                    },
                    resource2: {
                        rel3: "fuu"
                    }
                }
            fooUrl = '/url/foo',
                feeUrl = '/url/fee',
                createTransitionGraph = require('../rests/BaseTransitionGraph');

            let linkParser, transitionGraph;

            beforeEach(function () {
                linkParser = sinon.stub();
                linkParser.withArgs("resource1", 'foo', context, req).returns(fooUrl);
                linkParser.withArgs("resource1", 'fee', context, req).returns(feeUrl);

                transitionGraph = createTransitionGraph(graph, linkParser);
                transCondStub = sinon.stub();
            });

            it("最简单的迁移定义", function () {
                const links = transitionGraph.getLinks("resource1", context, req)
                expect(links).eql([{
                        rel: "rel1",
                        href: fooUrl
                    },
                    {
                        rel: "rel2",
                        href: feeUrl
                    },
                ])
            });

            describe('以对象表达迁移', () => {
                let transCondStub;

                beforeEach(function () {
                    transCondStub = sinon.stub();
                })

                it('至少应包含迁移目标资源Id', function () {
                    graph.resource1.rel2 = {
                        id: "fee"
                    };

                    const links = transitionGraph.getLinks("resource1", context, req)
                    expect(links).eql([{
                            rel: "rel1",
                            href: fooUrl
                        },
                        {
                            rel: "rel2",
                            href: feeUrl
                        },
                    ])
                });

                it("可以为一迁移定义一个迁移条件 - 未满足迁移条件", function () {
                    transCondStub.withArgs(context, req).returns(false);
                    graph.resource1.rel2 = {
                        id: "fee",
                        condition: transCondStub
                    };

                    const links = transitionGraph.getLinks("resource1", context, req)
                    expect(links).eql([{
                        rel: "rel1",
                        href: fooUrl
                    }])
                });

                it("可以为一迁移定义一个迁移条件 - 满足迁移条件", function () {
                    transCondStub.withArgs(context, req).returns(true);
                    graph.resource1.rel2 = {
                        id: "fee",
                        condition: transCondStub
                    };

                    const links = transitionGraph.getLinks("resource1", context, req)
                    expect(links).eql([{
                            rel: "rel1",
                            href: fooUrl
                        },
                        {
                            rel: "rel2",
                            href: feeUrl
                        }
                    ])
                });
            })
        })

        describe('对Rest服务的解析', function () {
            const bodyParser = require('body-parser'),
                requestAgent = require('supertest');
            const selfUrl = '/rests/foo/self'

            let url, desc, currentResource;
            let app, request, urlResolve, cacheControlParser, restDescriptor;

            beforeEach(function () {
                url = '/rests/foo';
                app = require('express')();
                app.use(bodyParser.json());
                request = requestAgent(app);
                currentResource = {
                    getResourceId: function () {},
                    getUrl: function () {},
                    getTransitionUrl: function () {},
                    getLinks: function () {}
                };
                currentResource = sinon.stub(currentResource);

                urlResolve = sinon.stub()
                cacheControlParser = sinon.stub()
                restDescriptor = require('../rests/RestDescriptor')(urlResolve, cacheControlParser)
            });

            describe('入口服务', function () {
                beforeEach(function () {
                    desc = {
                        type: 'entry'
                    };
                    restDescriptor.attach(app, currentResource, url, desc);
                });

                it('正确响应', function (done) {
                    var expectedLinks = [{
                            rel: 'rel1',
                            href: '/href1'
                        },
                        {
                            rel: 'rel2',
                            href: '/href2'
                        }
                    ];
                    currentResource.getLinks.resolves(expectedLinks);

                    request.get(url)
                        .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                        .expect(200, {
                            links: expectedLinks
                        }, done);
                });

                it('未知错误返回500内部错', function (done) {
                    currentResource.getLinks.rejects("err")
                    request.get(url)
                        .expect(500, done)
                });
            })

            describe('查询服务', function () {
                var elementResourceId, reqQuery, searchStub, resultCollection;

                beforeEach(function () {
                    reqQuery = {
                        arg1: "aaa",
                        arg2: 'bbb'
                    };
                    elementResourceId = "fuuuuuu";
                    searchStub = sinon.stub();

                    desc = {
                        type: 'query',
                        element: elementResourceId,
                        handler: searchStub
                    };

                    restDescriptor.attach(app, currentResource, url, desc);
                });

                it('正确响应', function (done) {
                    var queryStr = "?arg1=aaa&arg2=bbb";
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
                        items: [element1, element2],
                        perpage: 10,
                        page: 1,
                        total: 200
                    };
                    searchStub.withArgs(reqQuery).resolves(resultCollection)

                    var expectedLinks = [{
                            rel: 'rel1',
                            href: '/href1'
                        },
                        {
                            rel: 'rel2',
                            href: '/href2'
                        }
                    ];
                    currentResource.getLinks
                        .callsFake(function (context, req) {
                            expect(context).eql(resultCollection);
                            expect(req.originalUrl).eql(url + queryStr);
                            return Promise.resolve(expectedLinks);
                        });

                    var refElement1 = '/ref/element/001';
                    var refElement2 = '/ref/element/002';
                    currentResource.getTransitionUrl.callsFake(function (targetResourceId, context, req) {
                        expect(targetResourceId).eql(elementResourceId);
                        expect(req.originalUrl).eql(url + queryStr);
                        var refurl;
                        if (context === element1) refurl = refElement1;
                        if (context === element2) refurl = refElement2;
                        return refurl;
                    });

                    urlResolve.callsFake(function (req, urlArg) {
                        expect(urlArg).eql(url + queryStr);
                        return selfUrl;
                    });
                    restDescriptor.attach(app, currentResource, url, desc);

                    request.get(url)
                        .query(reqQuery)
                        .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                        .expect(200, {
                            collection: {
                                href: selfUrl,
                                items: [{
                                        link: {
                                            rel: elementResourceId,
                                            href: refElement1
                                        },
                                        data: {
                                            id: '001',
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
                                            id: '002',
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
                        }, done);
                });

                it('未知错误返回500内部错', function (done) {
                    err = "any error ...."
                    searchStub.returns(Promise.reject(err));
                    request.get(url)
                        .expect(500, err, done);
                });
            })

            describe('创建资源服务', function () {
                let targetResourceId, reqBody, handler, objCreated;
                beforeEach(function () {
                    targetResourceId = "fuuuuuu";
                    handler = sinon.stub();
                    desc = {
                        type: 'create',
                        target: targetResourceId,
                        handler: handler
                    };

                    restDescriptor.attach(app, currentResource, url, desc);
                });

                it('正确响应', function (done) {
                    reqBody = {
                        foo: "any request data used to create object"
                    };
                    objCreated = {
                        id: 'fooid',
                        foo: 'foo',
                        fee: 'fee'
                    };
                    handler.callsFake((req) => {
                        expect(req.body).eql(reqBody)
                        return Promise.resolve(objCreated)
                    })

                    var urlToCreatedObject = "/url/to/created/obj";
                    currentResource.getTransitionUrl.callsFake(function (target, context, req) {
                        expect(target).eql(targetResourceId);
                        expect(context).eql(objCreated);
                        expect(req.originalUrl).eql(url);
                        return urlToCreatedObject;
                    });

                    request.post(url)
                        .send(reqBody)
                        .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                        .expect('Location', urlToCreatedObject)
                        .expect(201, {
                            href: urlToCreatedObject,
                            fuuuuuu: objCreated,
                        }, done);
                });

                it('未知错误返回500内部错', function (done) {
                    handler.rejects("err");
                    request.post(url)
                        .send(reqBody)
                        .expect(500, done);
                });
            })

            describe('读取资源状态服务', function () {
                const resourceId = "fuuuu",
                    urlPattern = "/url/:id",
                    id = 'abcd',
                    url = '/url/' + id,
                    version = '123456',
                    modifiedDate = new Date(2017, 10, 10).toJSON(),
                    expectedLinks = [{
                            rel: 'rel1',
                            href: '/href1'
                        },
                        {
                            rel: 'rel2',
                            href: '/href2'
                        }
                    ]
                let handler, objRead

                beforeEach(function () {
                    objRead = {
                        id,
                        foo: 'foo',
                        fee: 'fee',
                        updatedAt: modifiedDate,
                        __v: version
                    }

                    handler = sinon.stub()
                    desc = {
                        type: 'read',
                        handler
                    }
                    currentResource.getResourceId.returns(resourceId)
                    urlResolve.callsFake(function (req, urlArg) {
                        expect(urlArg).eql(url);
                        return selfUrl;
                    })
                    currentResource.getLinks.callsFake((context, req) => {
                        expect(context).eql(objRead);
                        expect(req.originalUrl).eql(url);
                        return Promise.resolve(expectedLinks);
                    })
                    restDescriptor.attach(app, currentResource, urlPattern, desc);
                });

                it('未定义服务处理逻辑', (done) => {
                    delete desc.handler
                    request.get(url)
                        .expect(501, done)
                })

                it('应以函数表达服务处理逻辑', (done) => {
                    desc.handler = 'not a function'
                    request.get(url)
                        .expect(501, done)
                })

                // TODO: 测试处理If-None-Match、If-Modified-Since

                it('处理出错', (done) => {
                    handler.withArgs(id).rejects()
                    request.get(url)
                        .expect(500, done)
                })

                it('未找到资源', function (done) {
                    handler.withArgs(id).resolves()
                    request.get(url)
                        .expect(404, done);
                })

                it('URL中包含多个变量', function (done) {
                    const urlPattern = '/url/:id/:subid'
                    const url = '/url/1234/5678'
                    const representation = {
                        href: selfUrl,
                        links: expectedLinks
                    };
                    representation[resourceId] = {
                        ...objRead
                    }
                    urlResolve.callsFake(function (req, urlArg) {
                        expect(urlArg).eql(url);
                        return selfUrl;
                    })
                    currentResource.getLinks.callsFake((context, req) => {
                        expect(context).eql(objRead);
                        expect(req.originalUrl).eql(url);
                        return Promise.resolve(expectedLinks);
                    })
                    restDescriptor.attach(app, currentResource, urlPattern, desc)
                    handler.withArgs('1234', {id: '1234', subid: '5678'}).resolves(objRead)
                    request.get(url)
                        .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                        .expect('ETag', version)
                        .expect('Last-Modified', toUtc(modifiedDate))
                        .expect(200, representation, done)
                })


                describe('读取指定资源', () => {
                    let representation

                    beforeEach(() => {
                        handler.withArgs(id).resolves(objRead)
                        representation = {
                            href: selfUrl,
                            links: expectedLinks
                        };
                        representation[resourceId] = {
                            ...objRead
                        };
                    })

                    it('正确响应', function (done) {
                        request.get(url)
                            .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                            .expect('ETag', version)
                            .expect('Last-Modified', toUtc(modifiedDate))
                            .expect(200, representation, done)
                    });

                    it('正确响应，引用其他资源', function (done) {
                        const foourl = '/url/foo'
                        desc.dataRef = {
                            foo: 'foo'
                        }
                        currentResource.getTransitionUrl.callsFake((target, context, req) => {
                            expect(target).eql('foo')
                            expect(context).eql(objRead)
                            context.foo = foourl
                        })
                        representation[resourceId].foo = foourl
                        request.get(url)
                            .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                            .expect('ETag', version)
                            .expect('Last-Modified', toUtc(modifiedDate))
                            .expect(200, representation, done)
                    });

                    it('无ETag', function (done) {
                        delete objRead.__v
                        representation[resourceId] = {
                            ...objRead
                        }
                        request.get(url)
                            .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                            .expect('Last-Modified', toUtc(modifiedDate))
                            .expect(200, representation, done)
                    });

                    it('无Last-Modified', function (done) {
                        delete objRead.updatedAt
                        representation[resourceId] = {
                            ...objRead
                        }
                        request.get(url)
                            .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                            .expect('ETag', version)
                            .expect(200, representation, done)
                    });

                    it('Cache-Control', function (done) {
                        const cacheControl = {
                                cacheControl: 'any data to control cache'
                            },
                            cacheControlVal = 'cacheControlVal'
                        desc.cache = cacheControl
                        cacheControlParser.withArgs(cacheControl).returns(cacheControlVal)

                        request.get(url)
                            .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                            .expect('Cache-Control', cacheControlVal)
                            .expect('ETag', version)
                            .expect('Last-Modified', toUtc(modifiedDate))
                            .expect(200, representation, done)
                    });

                    describe('Cache validation', () => {
                        let validation

                        beforeEach(() => {
                            validation = sinon.stub()
                        })

                        it('未提供任何Cache validation方法， 数据未发生改变', function (done) {
                            request.get(url)
                                .set('If-None-Match', version)
                                .expect('ETag', version)
                                .expect('Last-Modified', toUtc(modifiedDate))
                                .expect(304, done)
                        });

                        it('未提供任何Cache validation方法， 数据改变', function (done) {
                            delete objRead.updatedAt
                            delete objRead.__v
                            representation[resourceId] = {
                                ...objRead
                            }
                            request.get(url)
                                .set('If-None-Match', version)
                                .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                                .expect(200, representation, done)
                        });

                        it('If-None-Match出错', function (done) {
                            validation.withArgs({
                                id
                            }, version).rejects()
                            desc.ifNoneMatch = validation
                            request.get(url)
                                .set('If-None-Match', version)
                                .expect(500, done)
                        });

                        it('提供If-None-Match方法， 数据未发生改变', function (done) {
                            validation.withArgs(id, version).resolves(false)
                            desc.ifNoneMatch = validation
                            request.get(url)
                                .set('If-None-Match', version)
                                .expect(304, done)
                        });

                        it('提供If-None-Match方法， 数据改变', function (done) {
                            delete objRead.updatedAt
                            delete objRead.__v
                            representation[resourceId] = {
                                ...objRead
                            }
                            validation.withArgs(id, version).resolves(true)
                            desc.ifNoneMatch = validation
                            request.get(url)
                                .set('If-None-Match', version)
                                .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                                .expect(200, representation, done)
                        });

                        it('If-Modified-Since出错', function (done) {
                            validation.withArgs(id, modifiedDate).rejects()
                            desc.ifModifiedSince = validation
                            request.get(url)
                                .set('If-Modified-Since', modifiedDate)
                                .expect(500, done)
                        });

                        it('提供If-Modified-Sinc方法， 数据未发生改变', function (done) {
                            validation.withArgs(id, modifiedDate).resolves(false)
                            desc.ifModifiedSince = validation
                            request.get(url)
                                .set('If-Modified-Since', modifiedDate)
                                .expect(304, done)
                        });

                        it('提供If-Modified-Sinc方法， 数据改变', function (done) {
                            delete objRead.updatedAt
                            delete objRead.__v
                            representation[resourceId] = {
                                ...objRead
                            }
                            validation.withArgs(id, modifiedDate).resolves(true)
                            desc.ifModifiedSince = validation
                            request.get(url)
                                .set('If-Modified-Since', modifiedDate)
                                .expect('Content-Type', 'application/vnd.finelets.com+json; charset=utf-8')
                                .expect(200, representation, done)
                        });
                    })
                })
            });

            describe('更新服务', function () {
                var id, version, body, doc, modifiedDate;
                let handler, ifMatch, ifUnmodifiedSince

                beforeEach(function () {
                    handler = sinon.stub()
                    ifMatch = sinon.stub()
                    ifUnmodifiedSince = sinon.stub()
                    desc = {
                        type: 'update',
                        ifMatch,
                        ifUnmodifiedSince,
                        handler
                    };
                    url = "/url/:id";
                    id = "foo";
                    version = "12345df";
                    modifiedDate = new Date(2017, 11, 11).toJSON()
                    body = {
                        body: "any data to update"
                    };
                    doc = {
                        doc: "doc identified by id"
                    };
                    restDescriptor.attach(app, currentResource, url, desc);
                });

                describe('条件请求', () => {
                    it('未定义handler', function (done) {
                        delete desc.handler
                        request.put("/url/" + id)
                            .expect(501, done); // response "501: Not Implemented"
                    });

                    it('处理方法不是一个函数', function (done) {
                        desc.handler = 'not a function'
                        request.put("/url/" + id)
                            .expect(501, done);
                    });

                    it('未定义任何条件校验方法', function (done) {
                        delete desc.ifMatch
                        delete desc.ifUnmodifiedSince
                        request.put("/url/" + id)
                            .expect(501, done);
                    });

                    it('ifMatch条件校验方法不是一个函数', function (done) {
                        desc.ifMatch = 'not a function'
                        request.put("/url/" + id)
                            .expect(501, done);
                    });

                    it('ifUnmodifiedSince条件校验方法不是一个函数', function (done) {
                        delete desc.ifMatch
                        desc.ifUnmodifiedSince = 'not a function'
                        request.put("/url/" + id)
                            .expect(501, done);
                    });

                    it('请求中未包含条件', function (done) {
                        request.put("/url/" + id)
                            .expect(428, done);
                    });


                    it('IF-MATCH条件校验出错', function (done) {
                        ifMatch.withArgs(id, version).rejects()
                        request.put("/url/" + id)
                            .set("If-Match", version)
                            .expect(500, done)
                    });

                    it('不满足IF-MATCH请求条件', function (done) {
                        ifMatch.withArgs(id, version).resolves(false)
                        request.put("/url/" + id)
                            .set("If-Match", version)
                            .expect(412, done)
                    });

                    it('If-Unmodified-Since条件校验出错', function (done) {
                        delete desc.ifMatch
                        ifUnmodifiedSince.withArgs(id, modifiedDate).rejects()
                        request.put("/url/" + id)
                            .set("If-Unmodified-Since", modifiedDate)
                            .expect(500, done)
                    });

                    it('不满足If-Unmodified-Since请求条件', function (done) {
                        delete desc.ifMatch
                        ifUnmodifiedSince.withArgs(id, modifiedDate).resolves(false)
                        request.put("/url/" + id)
                            .set("If-Unmodified-Since", modifiedDate)
                            .expect(412, done)
                    });

                    it('处理出错', function (done) {
                        ifMatch.withArgs(id, version).resolves(true)
                        handler.withArgs(id, body).rejects()
                        request.put("/url/" + id)
                            .set("If-Match", version)
                            .send(body)
                            .expect(500, done)
                    });

                    it('条件请求下文档状态不一致', function (done) {
                        ifMatch.withArgs(id, version).resolves(true)
                        handler.withArgs(id, body).resolves()
                        request.put("/url/" + id)
                            .set("If-Match", version)
                            .send(body)
                            .expect(409, done)
                    });

                    it('满足请求条件, 并正确响应', function (done) {
                        delete desc.ifMatch
                        ifUnmodifiedSince.withArgs(id, modifiedDate).resolves(true)
                        handler.withArgs(id, body).resolves({})
                        urlResolve.returns(selfUrl)
                        request.put("/url/" + id)
                            .set("If-Unmodified-Since", modifiedDate)
                            .send(body)
                            .expect("Content-Location", selfUrl)
                            .expect(204, done);
                    });
                })

                describe('无条件请求', () => {
                    beforeEach(() => {
                        desc.conditional = false
                    })

                    it('处理出错', function (done) {
                        handler.withArgs(id, body).rejects()
                        request.put("/url/" + id)
                            .send(body)
                            .expect(500, done)
                    });

                    it('未找到文档或状态不一致', function (done) {
                        handler.withArgs(id, body).resolves()
                        request.put("/url/" + id)
                            .send(body)
                            .expect(409, done);
                    });

                    it('无条件请求, 正确响应', function (done) {
                        handler.withArgs(id, body).resolves({})
                        urlResolve.returns(selfUrl)
                        request.put("/url/" + id)
                            .set("If-Unmodified-Since", modifiedDate)
                            .send(body)
                            .expect("Content-Location", selfUrl)
                            .expect(204, done);
                    });
                })
            });

            describe('删除服务', function () {
                const url = "/url/:id",
                    id = 'foo';
                let handler;

                beforeEach(function () {
                    handler = sinon.stub()
                    desc = {
                        type: 'delete',
                        handler: handler
                    };
                    restDescriptor.attach(app, currentResource, url, desc);
                })

                it('未定义handler', function (done) {
                    delete desc.handler
                    request.delete("/url/" + id)
                        .expect(501, done); // response "501: Not Implemented"
                })

                it('handler不是一个方法', function (done) {
                    desc.handler = 'is not function'
                    request.delete("/url/" + id)
                        .expect(501, done); // response "501: Not Implemented"
                })

                it('handler处理失败', function (done) {
                    handler.withArgs(id).rejects()
                    request.delete("/url/" + id)
                        .expect(500, done);
                })

                it('资源未找到', function (done) {
                    handler.withArgs(id).resolves()
                    request.delete("/url/" + id)
                        .expect(404, done);
                })

                it('拒绝', function (done) {
                    handler.withArgs(id).resolves(false)
                    request.delete("/url/" + id)
                        .expect(405, done);
                })

                it('正确响应', function (done) {
                    handler.withArgs(id).resolves(true)
                    request.delete("/url/" + id)
                        .expect(204, done);
                })
            });
        })

        describe('对资源描述的解析', function () {
            var request, router, handler, url;
            var desc, restDesc, resourceId;
            var resourceRegistry, attachSpy;
            var dataToRepresent;

            beforeEach(function () {
                resourceId = 'foo';
                dataToRepresent = {
                    data: 'any data'
                };
                router = require('express')();
                request = require('supertest')(router);
                url = '/rests/foo';
                handler = function (req, res) {
                    return dataToRepresent;
                };

                restDesc = {
                    type: "READ",
                    rest: 'any rest descriptor'
                };

                desc = {
                    url: url,
                    rests: [restDesc]
                }

                attachSpy = sinon.spy();
                stubs['./RestDescriptor'] = {
                    attach: attachSpy
                };
                resourceRegistry = require('../rests/ResourceRegistry')()
            });

            it('一个资源应具有寻址性，必须定义url模板', function () {
                delete desc.url;
                expect(function () {
                    resourceRegistry.attach(router, resourceId, desc);
                }).throw('a url must be defined!');
            });

            it('提供当前资源标识', function () {
                var resource = resourceRegistry.attach(router, 'foo', desc);
                expect(resource.getResourceId()).eql('foo');
            });

            it('构建从一个资源迁移到另一个资源的URL', function () {
                var fooDesc = {
                    url: '/url/foo',
                    rests: [restDesc]
                };
                var feeDesc = {
                    url: '/url/fee',
                    rests: [restDesc]
                };

                var req = {
                    params: {},
                    query: {}
                }

                var expectedUrl = "/expected/url";
                var urlResolveStub = sinon.stub();
                urlResolveStub.withArgs(req, '/url/fee').returns(expectedUrl);
                stubs['../express/Url'] = {
                    resolve: urlResolveStub
                };
                resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

                var fooResource = resourceRegistry.attach(router, 'foo', fooDesc);
                resourceRegistry.attach(router, 'fee', fooDesc);
                resourceRegistry.attach(router, 'fee', feeDesc);
                resourceRegistry.getTransitionUrl("foo", "fee", context, req);
            });

            it('获得当前资源状态下的迁移链接列表', function () {
                var req = {
                    reg: 'any request'
                };
                var context = {
                    context: 'any context'
                };
                var links = [{
                    rel: "foo",
                    href: "/foo"
                }, {
                    rel: "fee",
                    href: "/fee"
                }];
                //var getLinksStub = createPromiseStub([resourceId, context, req], [links]);
                var getLinksStub = sinon.stub()
                getLinksStub.withArgs(resourceId, context, req).resolves(links);

                resourceRegistry = require('../rests/ResourceRegistry');
                resourceRegistry.setTransitionGraph({
                    getLinks: getLinksStub
                });
                var resource = resourceRegistry.attach(router, resourceId, desc);

                return resource.getLinks(context, req)
                    .then(function (data) {
                        expect(data).eql(links);
                    })
            });

            it('资源定义错：未定义任何rest服务列表', () => {
                delete desc.rests;
                expect(function () {
                    resourceRegistry.attach(router, resourceId, desc);
                }).throw('no restful service is defined!');
            });

            it('资源定义错：未定义任何rest服务', function () {
                desc.rests = [];
                expect(function () {
                    resourceRegistry.attach(router, resourceId, desc);
                }).throw('no restful service is defined!');
            });

            it('加载资源时将导致该资源的所有服务被加载', function () {
                var attachSpy = sinon.spy();
                stubs['./RestDescriptor'] = {
                    attach: attachSpy
                };
                resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

                var resource = resourceRegistry.attach(router, resourceId, desc);
                expect(attachSpy).calledWith(router, resource, url, restDesc);
            });

            describe('构建当前资源的URL', function () {
                var fromResourceId, context, req;
                var resource;
                var expectedUrl, urlResolveStub;

                beforeEach(function () {
                    fromResourceId = 'fff';
                    context = {};
                    req = {
                        params: {},
                        query: {}
                    }

                    expectedUrl = "/expected/url";
                    urlResolveStub = sinon.stub();
                    stubs['../express/Url'] = {
                        resolve: urlResolveStub
                    };
                });

                it('无路径变量', function () {
                    urlResolveStub.withArgs(req, url).returns(expectedUrl);
                    resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

                    resource = resourceRegistry.attach(router, resourceId, desc);
                    expect(resource.getUrl(fromResourceId, context, req)).eql(expectedUrl);
                });

                it('未定义迁移，缺省方式从上下文中取同路径变量名相同的属性值', function () {
                    desc.url = '/url/:arg1/and/:arg2/and/:arg3';
                    context.arg3 = '1234';
                    req.params.arg2 = '3456';
                    req.query.arg1 = '5678';

                    urlResolveStub.withArgs(req, '/url/5678/and/3456/and/1234').returns(expectedUrl);
                    resourceRegistry = proxyquire('../rests/ResourceRegistry', stubs);

                    resource = resourceRegistry.attach(router, resourceId, desc);
                    expect(resource.getUrl(fromResourceId, context, req)).eql(expectedUrl);
                });

                it('通过定义迁移指定路径变量的取值', function () {
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
        })
    })
});