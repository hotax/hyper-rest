/**
 * Created by clx on 2017/10/13.
 */
const specsDb = require('../db/Specifications');
module.exports = {
    url: '/api/specs/:id',
    rests: [{
        type: 'read',
        handler: function (req, res) {
            var id = req.params["id"];
            return specsDb.findById(id);
        }
    }]
}