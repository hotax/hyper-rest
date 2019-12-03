const __ = require('underscore')

function __getUpdatedAtNameFromSchema(schema) {
    return schema.schema.$timestamps.updatedAt
}

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

        return __config.schema.findById(id, __config.projection)
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
        return this.ifUnmodifiedSince(id, version)
            .then((data) => {
                return !data
            })
    }

    ifMatch(id, version) {
        return this.__config.schema.findById(id)
            .then(doc => {
                if (doc) {
                    return doc.__v.toString() === version
                }
                return false
            })
    }

    ifUnmodifiedSince(id, version) {
        const updatedAtName = __getUpdatedAtNameFromSchema(this.__config.schema)
        return this.__config.schema.findById(id)
            .then(doc => {
                if (doc) {
                    return doc[updatedAtName].toUTCString() === version
                }
                return false
            })
    }

    search(cond, text) {
        const config = this.__config
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

        let sort = config.sort
        if (!sort) {
            sort = {}
            const updatedAtName = __getUpdatedAtNameFromSchema(config.schema)
            sort[updatedAtName] = -1
        }
        const limit = config.queryListLinesLimit || process.env.QUERY_LIST_LINES_LIMIT || 20
        return config.schema.find(query, config.listable).sort(sort).limit(limit * 1)
            .then(data => {
                return __.map(data, item => {
                    return item.toJSON()
                })
            })
    }

    remove(id) {
        return this.__config.schema.deleteOne({
                _id: id
            })
            .then((data) => {
                if (data.n === 0 && data.deletedCount === 0) return
                return (data.deletedCount === 1 && data.ok === 1)
            })
    }

    listSubs(id, subFld) {
        return this.__config.schema.findById(id)
            .then(doc => {
                if (doc) {
                    const subs = doc[subFld]
                    if (subs) {
                        return __.map(subs, item => {
                            return item.toJSON()
                        })
                    }
                }
            })
    }
}

const __create = (config, addIn) => {
    const entity = new Entity(config)

    const obj = {
        create(data) {
            return entity.create(data)
        },

        findById(id, projection) {
            return entity.findById(id, projection)
        },

        search(cond, text, sort) {
            return entity.search(cond, text, sort)
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

        remove(id) {
            return entity.remove(id)
        },

        listSubs(id, subFld) {
            return entity.listSubs(id, subFld)
        },

        ...addIn
    }

    return obj
}

module.exports = __create