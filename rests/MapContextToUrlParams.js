const _ = require('underscore')

class __MapContextToUrlParams {
    constructor(map) {
        this.map = map
    }

    toParams(resourceId, req, ctx) {
        const params = {}
        const map = this.map[resourceId]
        if(map) {
            _.each(map, (val, key) => {
                let segs = val.split('.');
                if (segs[0] === 'context') {
                    params[key] = ctx[segs[1]];
                } else {
                    params[key] = req[segs[0]][segs[1]];
                }
            })
        }
        return params
    }

    getRefKey(resourceId) {
        const map = this.map[resourceId]
        if(map) {
            const keys = _.keys(map)
            return _.find(keys, k => {
                return map[k] === 'context'
            })
        }
    }
}

function create(map) {
    return new __MapContextToUrlParams(map || {})
}

module.exports = create