const createCollection = require('../db/mongoDb/CreateCollection'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId

const dbModel = createCollection({
    name: 'WxSession',
    schema: {
        token: {type:String, required:true},
        openid: {type:String, required:true},
        session_key: {type:String, required:true},
        userId: ObjectId
    },
    indexes: [
        {
            index: {openid: 1},
            options: {unique: true}
        },
        {
            index: {token: 1},
            options: {unique: true}
        }
    ]
})

module.exports = dbModel