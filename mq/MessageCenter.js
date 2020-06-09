const mq = require('./RabbitMessageCenter'),
    __ = require('underscore');

const startup = (config) => {
    return mq.start(config)
        .then(() => {
            __.each(config.exchanges, (ex, exName) => {
                if (ex.publishes && ex.publishes.length > 0) {
                    let exPublishes = {}
                    ex.publishes.forEach((p) => {
                        exPublishes[p] = (msg) => {
                            return mq.publish(exName, p, msg)
                        }
                    })
                    if (ex.isDefault) {
                        Object.assign(MC, exPublishes)
                    } else {
                        MC[ex] = exPublishes
                    }
                }
            })
        })
}

const MC = {
    start: startup,
}

module.exports = MC