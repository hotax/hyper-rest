const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const AuthorizingCodes = mongoose.model(
    'AuthorizingCodes',
    new Schema({
        request: {
            type: Object
        }
    }, {
        toJSON: {
            transform: function (doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            }
        }
    })
);

module.exports = AuthorizingCodes;