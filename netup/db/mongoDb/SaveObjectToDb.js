/**
 * Created by clx on 2017/11/16.
 */
module.exports = function (model, data) {
    return new model(data).save();
}