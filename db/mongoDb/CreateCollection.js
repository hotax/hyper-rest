const mongoose = require('mongoose'),
    createSchema = require('./CreateSchema'),
    updateIfCurrentPlugin = require('mongoose-update-if-current').updateIfCurrentPlugin

function createCollection(config) {
    const {indexes, pres, posts} = config
    const timestamps = config.timestamps || true
    const options = {indexes, pres, posts, timestamps}
    const sm = createSchema(config.schema, options)
    sm.plugin(updateIfCurrentPlugin)
    
    return mongoose.model(config.name, sm);
}

module.exports = createCollection