const specsDb = require('../db/Specifications');

module.exports = {
    url: '/api/specs',
    rests: [{
        type: 'create',
        target: 'Specification',
        handler: specsDb.add
    }]
}