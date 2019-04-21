/**
 * Created by clx on 2017/11/16.
 */
const __ = require('underscore')

function isObjectID(val) {
    return __.isObject(val) && val._bsontype && val._bsontype === 'ObjectID'
}

const transform = {
    transform: function (doc, ret) {
        ret.id = doc.id;
        delete ret._id;
        for (var prop in doc) {
            if (doc[prop] instanceof Date) {
                ret[prop] = doc[prop].toJSON();
            }
            if (isObjectID(doc[prop])) {
                ret[prop] = doc[prop].toString()
            }
        }
    }
};

module.exports = {
    toObject: transform,
    toJSON: transform
};