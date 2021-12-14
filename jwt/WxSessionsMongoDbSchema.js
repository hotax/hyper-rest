const createCollection = require('../db/mongoDb/CreateCollection')

const dbModel = createCollection({
    name: 'WxSession',
    schema: {
        token: {type:String, required:true},
        openid: {type:String, required:true},
        session_key: {type:String, required:true},
        userId: String
    },
    indexes: [
        {
            index: {openid: 1},
            options: {unique: true}
        }
    ]
})

module.exports = dbModel