const amqp = require('amqplib'),
    Promise = require('bluebird'),
    __ = require('underscore'),
    logger = require('@finelets/hyper-rest/app/Logger');

let __conn;
let __connTimes = 0
let __publishes = {}

class __Publish {
    constructor(name) {
        this.__ex = name
    }

    publish(type, msg) {
        const payload = Buffer.from(JSON.stringify(msg))
        let channel
        let ex = this.__ex
        return __conn.createConfirmChannel()
            .then((ch) => {
                channel = ch
                return ch.assertExchange(ex, 'topic', {
                    durable: false
                })
            })
            .then(function () {
                return channel.publish(ex, type, payload, {}, (err, ok) => {
                    if (err !== null)
                        return Promise.reject(err)
                    else
                        return ok
                });
            });
    }
}

const __createQueue = (ch, ex, name, config) => {
    let queue
    return ch.assertQueue(name, {
            durable: false
        })
        .then((q) => {
            queue = q.queue
            return ch.bindQueue(queue, ex, config.topic)
        })
        .then(() => {
            return ch.consume(queue, (msg) => {
                let payload = JSON.parse(msg.content.toString())
                return config.consumer(payload)
                    .then((ok) => {
                        if (ok === true || ok === false) {
                            if (!ok)
                                logger.warn('The message consumer decide to requeue the message!')
                            return ok ? ch.ack(msg) : ch.nack(msg)
                        }
                        logger.warn('You should ack the message by true or false!')
                        return ch.ack(msg)
                    })
                    .catch((err) => {
                        logger.warn('the consumer has rejected message:\r\n' + JSON.stringify(payload) +
                            '\r\nError:' + JSON.stringify(err))
                        return ch.nack(msg, false, false)
                    })
            })
        })
}

const __createExchange = (ch, name, config) => {
    let queues = []
    return ch.assertExchange(name, 'topic', {
            durable: false
        })
        .then(() => {
            __.each(config.queues, (element, key) => {
                queues.push(__createQueue(ch, name, key, element))
            })
            return Promise.all(queues)
        })
        .then(() => {
            __publishes[name] = new __Publish(name)
        })
}

const __start = (config) => {
    logger.debug('MQ connection: ' + config.connect)
    return amqp.connect(config.connect)
        .then((conn) => {
            logger.debug('MQ connected successfully!')
            __connTimes = 0
            __conn = conn
            return __conn.createChannel()
        })
        .then((ch) => {
            let exchanges = []
            __.each(config.exchanges, (element, key) => {
                exchanges.push(__createExchange(ch, key, element))
            })
            return Promise.all(exchanges)
        })
        .catch(err => {
            ++__connTimes
            logger.error('Times: ' + __connTimes)
            logger.error('Failed to connect to MQ:\n\r' + JSON.stringify(err, null, 2))
            setTimeout(__start, 2000, config);
        })
}

const rabbitMessageCenter = {
    start: (config) => {
        return __start(config)
    },

    publish: (name, type, msg) => {
        return __publishes[name].publish(type, msg)
    }
}
module.exports = rabbitMessageCenter