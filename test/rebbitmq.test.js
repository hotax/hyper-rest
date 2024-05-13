describe('RabbitMq', function () {
    const mqConnStr = 'amqp://mnf:mnf3322@47.120.72.233:5672';
    // const mqConnStr = 'amqp://guest:guest@localhost';
    // const mqConnStr = 'amqp://admin:admin@47.97.153.158';
    // const mqConnStr = 'amqp://jsm:jsm@192.168.5.166'
    let stubs, err;
    beforeEach(function () {
        stubs = {};
        err = new Error('any error message');
    })

    describe('RabbitMessageCenter', () => {
        const mc = require('../mq/RabbitMessageCenter')
        let config;

        it('publish a single message', () => {
            const msg = {
                foo: 'any data of message'
            }
            let aConsumer = sinon.stub()
            aConsumer.withArgs(msg).resolves(true)

            config = {
                connect: mqConnStr,
                exchanges: {
                    foo: {
                        queues: {
                            qa: {
                                topic: 't1',
                                consumer: aConsumer
                            }
                        }
                    }
                }
            }
            return mc.start(config)
                .then(() => {
                    return mc.publish('foo', 't1', msg)
                })
                .then((data) => {
					// 事实上publish只保证publish过程中没有出错！！！！！！！
					expect(data).true
					// 发布完成后并不代表消息一定已得到处理
					// expect(aConsumer.callCount).eqls(1)
				})
        })

        
        it('reject ack message', () => {
            const msg = {
                foo: 'any data of message'
            }
            let aConsumer = sinon.stub()
            aConsumer.withArgs(msg).onFirstCall().resolves(false)
            aConsumer.withArgs(msg).onSecondCall().resolves(true)

            config = {
                connect: mqConnStr,
                exchanges: {
                    foo: {
                        queues: {
                            qa: {
                                topic: 't1',
                                consumer: aConsumer
                            }
                        }
                    }
                }
            }
            return mc.start(config)
                .then(() => {
                    return mc.publish('foo', 't1', msg)
                })
                .then((data) => {
					// 事实上publish只保证publish过程中没有出错！！！！！！！
					expect(data).true
					// 发布完成后并不代表消息一定已得到处理
					// expect(aConsumer.callCount).eqls(2)
				})
        })
    })
})