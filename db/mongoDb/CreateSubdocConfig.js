const {map, pick, isArray, isObject} = require('underscore')

const filter = (source) => {
    return pick(source, (val) => {
        return !isArray(val) && !isObject(val)
    })
}

const filterWithOutConfig = (path, source) => filter(source)

const listFilterWithoutConfig = (path, source) => {
    source = map(source, (obj) => {
        return filter(obj)
    })
    return source
}

module.exports = (config) => {

    let filters = {
        filter: filterWithOutConfig,
        filterFromList: listFilterWithoutConfig,
        filterNew: filter
    }

    if (!config) return filters

    if (config.projection) {
        filters.filter = (path, source) => {
            let flds = config.projection[path]
            if (!flds) return filter(source)

            flds = [...flds, ...['id', '__v', 'updatedAt']]
            return pick(source, flds)
        }
    }

    if (config.listable) {
        filters.filterFromList = (path, source) => {
            let flds = config.listable[path]
            if (!flds) return listFilterWithoutConfig(undefined, source)

            flds = [...flds, ...['id']]
            return map(source, (obj) => {
                return pick(obj, flds)
            })
        }
    }
    
    return filters
}