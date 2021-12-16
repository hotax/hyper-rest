const createCollection = require('../db/mongoDb/CreateCollection'),
    mongoose = require('mongoose'),
    ObjectId = mongoose.Schema.Types.ObjectId

const dbModel = createCollection({
    name: 'User',
    schema: {
        userId: String,
        name: {type:String, required:true},
        password: String,
        openid: String,
        pic: String,
        email: String,
        isAdmin: Boolean,
        roles: String,
        inUse: Boolean
    },
    indexes: [
        {
            index: {name: 1},
            options: {unique: true}
        },
        {
            index: {userId: 1},
            options: {unique: true}
        }
    ]
})

module.exports = dbModel