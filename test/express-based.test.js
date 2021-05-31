/**
 * Created by clx on 2017/10/9.
 */
const proxyquire = require('proxyquire')

describe('express', function () {
    describe('基于express实现', function () {
        let err, stubs
        beforeEach(function () {
            stubs = {};
            err = new Error('any error message');
        });

        describe('组装完整的URL', function () {
            var protocol, getHostStub, reqStub, URL;

            beforeEach(function () {
                protocol = 'http';
                getHostStub = sinon.stub();
                reqStub = {
                    protocol: protocol,
                    get: getHostStub
                };
                URL = require('../express/Url');
            });

            it('包含端口号', function () {
                getHostStub.withArgs('host').returns("www.hotex.com:2341");
                expect(URL.resolve(reqStub, '/rest/foo')).eql("http://www.hotex.com:2341/rest/foo");
            });

            it('应省略HTTP下的80端口号', function () {
                getHostStub.withArgs('host').returns("www.hotex.com:80");
                expect(URL.resolve(reqStub, '/rest/foo')).eql("http://www.hotex.com/rest/foo");
            });
        });

        describe('开发人员可以加载handlebars View engine', function () {
            var viewsDir, viewEngineName, viewEngine, expressApp, appMock;
            var handlebarsEngineCreatorStub;
            var viewsEngineFactory;

            beforeEach(function () {
                viewsDir = '/views/dir';
                viewEngineName = 'foo-engine';
                viewEngine = new Object();
                expressApp = require('express')();
                appMock = sinon.mock(expressApp);
                appMock.expects('set').withExactArgs('views', viewsDir).once();
                appMock.expects('engine').withExactArgs(viewEngineName, viewEngine).once();
                appMock.expects('set').withExactArgs('view engine', viewEngineName).once();

                handlebarsEngineCreatorStub = sinon.stub();
            });

            it('缺省配置', function () {
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

            it('设置view partials目录', function () {
                var partialsDir = '/partials/dir';
                handlebarsEngineCreatorStub.withArgs({
                    partialsDir: partialsDir,
                    extname: '.' + viewEngineName
                }).returns({
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

            it('设置view文件扩展名', function () {
                var extname = '.handlebars';
                handlebarsEngineCreatorStub.withArgs({
                    partialsDir: viewsDir + '/partials',
                    extname: extname
                }).returns({
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

            it('设置helpers', function () {
                var helpers = new Object();
                handlebarsEngineCreatorStub.withArgs({
                    partialsDir: viewsDir + '/partials',
                    extname: '.' + viewEngineName,
                    helpers: helpers
                }).returns({
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
    });

});