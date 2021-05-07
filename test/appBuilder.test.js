const bodyParser = require('body-parser'),
    requestAgent = require('supertest');

describe('AppBuilder', function () {
    var app, stubs, err
    var appBaseDir, appBuilder;

    beforeEach(function () {
        stubs = {}
        err = new Error('any error message')
        app = require('express')();
        app.use(bodyParser.json());
        request = requestAgent(app);
        appBaseDir = __dirname;
        appBuilder = require('../express/AppBuilder').begin(appBaseDir);
    })

    it('设置网站根目录', function (done) {
        app = appBuilder
            .setWebRoot('/app', './data/website')
            .end()
            .getApp();
        request = requestAgent(app);
        let expected = require('./data/website/staticResource.json')
        request.get('/app/staticResource.json').expect(200, expected, done);
    });

    it('开发人员可以加载handlebars View engine', function () {
        var loadSpy = sinon.spy();
        app = appBuilder
            .setViewEngine({
                attachTo: loadSpy
            })
            .end()
            .getApp();
        expect(loadSpy).calledWith(app).calledOnce;
    });

    it('开发人员可以加载Rest服务', function () {
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

        var app = appBuilder
            .setResources(resourceRegistry, resources)
            .end()
            .getApp();

        expect(attachSpy).calledWith(app, 'foo', fooResourceDesc);
        expect(attachSpy).calledWith(app, 'fee', feeResourceDesc);
    });

    it('设置JWT', () => {
        let jwt = sinon.spy()
        let config = {
            config: 'any jwt config'
        }
        app = appBuilder
            .setJwt(jwt, config)
            .end()
            .getApp()
        expect(jwt).calledWith(app, config).calledOnce
    })

    describe('运行服务器', function () {
        const superagent = require('superagent');
        var server, port;

        beforeEach(function (done) {
            port = 3301;
            appBuilder.setWebRoot('/', './data/website');
            done();
        });

        afterEach(function (done) {
            server.close(function () {
                console.log(('and now the server is stoped!'));
                done();
            });
        });

        function runAndCheckServer(url, done) {
            server = appBuilder.run(function () {
                superagent.get(url)
                    .end(function (e, res) {
                        expect(e).eql(null);
                        expect(res.body.name).eql('foo');
                        done();
                    });
            });

        }

        it('运行一个缺省的Server', function (done) {
            defaultPort = 9001
            runAndCheckServer('http://localhost:9001/staticResource.json', done);
        });

        it('系统管理员可以通过设置Node.js运行环境变量设定端口号', function (done) {
            process.env.PORT = port;
            runAndCheckServer('http://localhost:' + port + '/staticResource.json', done);
        });
    });
});