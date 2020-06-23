const _ = require('lodash'),
    mongoose = require('mongoose');

const isObjectId = (obj) => {
    return _.isObject(obj) && obj._bsontype == 'ObjectID'
}

const obj = {

    createObjectId: (id) => {
        return mongoose.Types.ObjectId(id);
    },
    
    convertToJSON: (obj, keysToRemove = []) => {
        const result = {}
        const keys = _.keys(obj)
        _.forEach(keys, (k) => {
            if (!(_.indexOf(keysToRemove, k) != -1)) {
                const val = obj[k]
                if (isObjectId(val)) {
                    const finalVal = val.toString()
                    if (k == '_id') {
                        result.id = finalVal
                    } else {
                        result[k] = finalVal
                    }
                } else if (_.isDate(val)) {
                    result[k] = val.toJSON()
                } else {
                    result[k] = val
                }
            }
        })
        return result
    }
}

module.exports = obj