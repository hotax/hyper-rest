const proxyquire = require('proxyquire')

describe('Cross', () => {
    let stubs
    beforeEach(() => {
        stubs = {};
        err = new Error('any error message');
    })

    describe('注册资源', () => {
        it('使用缺省', () => {
            const index = require('../rests')
        })
    })

    describe('上载服务', () => {
        const bodyParser = require('body-parser'),
            requestAgent = require('supertest');
        let selfUrl, urlResolveStub, restDescriptor;
        let app, request, currentResource, handler;

        beforeEach(() => {
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

            selfUrl = '/rests/foo/self';
            urlResolveStub = sinon.stub();
            stubs['../express/Url'] = {
                resolve: urlResolveStub
            };
            restDescriptor = proxyquire('../rests/RestDescriptor', stubs);

            handler = sinon.stub();
            desc = {
                type: 'upload',
                handler: handler
            };
            url = "/url";
            restDescriptor.attach(app, currentResource, url, desc);
        });

        it('正确响应', (done) => {
            app = require('express')();
            app.use(bodyParser.json());
            const events = require('events');
            desc.handler = new events.EventEmitter();
            let pipe = sinon.stub()
            pipe.callsFake((stream) => {
                expect(stream).eqls(desc.handler)
                desc.handler.emit('finish')
            })
            app.use((req, res, next) => {
                req.pipe = pipe
                next()
            })
            let expectedLinks = [{
                    rel: 'rel1',
                    href: '/href1'
                },
                {
                    rel: 'rel2',
                    href: '/href2'
                }
            ]
            currentResource.getLinks.returns(Promise.resolve(expectedLinks));

            restDescriptor = proxyquire('../rests/RestDescriptor', stubs);

            restDescriptor.attach(app, currentResource, url, desc);
            request = requestAgent(app);

            request.post(url)
                .expect('Content-Type', 'application/vnd.hotex.com+json; charset=utf-8')
                .expect(200, {
                    links: expectedLinks
                }, done);
        })
    })
})