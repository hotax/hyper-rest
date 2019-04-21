const __ = require('underscore')

class Entity {
    constructor(config) {
        this.__config = config
    }

    create(data) {
        const schema = this.__config.schema
        return new schema(data).save()
            .then(doc => {
                return doc.toJSON()
            })
    }

    findById(id) {
        let __config = this.__config
        return __config.schema.findById(id)
            .then(doc => {
                let result
                if (doc) result = doc.toJSON()
                return result
            })
    }

    update(data) {
        let __config = this.__config
        return __config.schema.findById(data.id)
            .then(doc => {
                if (doc && doc.__v >= 0 && doc.__v === data.__v) {
                    __.each(__config.updatables, fld => {
                        if (__.isString(data[fld]) && data[fld].length === 0) doc[fld] = undefined
                        else doc[fld] = data[fld]
                    })
                    if (__config.setValues) __config.setValues(doc, data)
                    return doc.save()
                        .then(doc => {
                            return doc.toJSON()
                        })
                }
            })
    }

    ifNoneMatch(id, version) {
        return this.ifMatch(id, version)
            .then((data) => {
                return !data
            })
    }

    ifModifiedSince(id, version) {
        return ifUnmodifiedSince(id, version)
            .then((data) => {
                return !data
            })
    }

    ifMatch(id, version) {
        return this.__config.schema.findById(id)
            .then(doc => {
                if (doc) {
                    return doc.__v === version
                }
                return false
            })
    }

    ifUnmodifiedSince(id, version) {
        return this.__config.schema.findById(id)
            .then(doc => {
                if (doc) {
                    return doc.updatedAt.toUTCString() === version
                }
                return false
            })
    }

    search(cond, text) {
        let config = this.__config
        let query = cond

        if (text && text.length > 0) {
            let filters = __.map(config.searchables, fld => {
                let filter = {}
                filter[fld] = {
                    $regex: text,
                    $options: 'si'
                }
                return filter
            })
            query = {
                $and: [cond, {
                    $or: filters
                }]
            }
        }

        return config.schema.find(query).sort({
                modifiedDate: -1
            }).limit(20) // TODO: 通过参数设定笔数
            .then(data => {
                return __.map(data, item => {
                    return item.toJSON()
                })
            })
    }
}

const __create = (config, addIn) => {
    const entity = new Entity(config)

    const obj = {
        create(data) {
            return entity.create(data)
        },

        findById(id) {
            return entity.findById(id)
        },

        search(cond, text) {
            return entity.search(cond, text)
        },

        ifMatch(id, version) {
            return entity.ifMatch(id, version)
        },

        ifUnmodifiedSince(id, version) {
            return entity.ifUnmodifiedSince(id, version)
        },

        update(data) {
            return entity.update(data)
        },

        ...addIn
    }

    return obj
}

module.exports = __create