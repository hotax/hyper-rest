const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    __ = require('underscore'),
    transformOption = require('./DocTransformOption')

function createSchema(schema, options) {
    let finalOptions = options || {}
    finalOptions = {
        ...transformOption,
        autoCreate: true,
        ...finalOptions
    }
    const sm = new Schema(schema, finalOptions)
    if (finalOptions.indexes) {
        __.each(finalOptions.indexes, (idx) => {
            sm.index(idx.index, idx.options)
        })
    }
    if (finalOptions.pres) {
        __.each(finalOptions.pres, (func, name) => {
            sm.pre(name, func)
        })
    }
    if (finalOptions.posts) {
        __.each(finalOptions.posts, (func, name) => {
            sm.post(name, func)
        })
    }

    return sm
}

module.exports = createSchema