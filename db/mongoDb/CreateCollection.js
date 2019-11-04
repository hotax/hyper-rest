const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    transformOption = require('./DocTransformOption'),
    __ = require('underscore'), 
    updateIfCurrentPlugin = require('mongoose-update-if-current').updateIfCurrentPlugin

function createCollection(config) {
    const timestamps = config.timestamps || true
    const sm = new Schema(config.schema, {
        ...transformOption,
        autoCreate: true,
        timestamps
    })
    sm.plugin(updateIfCurrentPlugin)
    __.each(config.indexes, (idx) => {
        sm.index(idx.index, idx.options)
    })
    return mongoose.model(config.name, sm);
}

module.exports = createCollection