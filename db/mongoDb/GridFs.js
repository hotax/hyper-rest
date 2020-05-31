const mongodb = require('mongodb'),
    mongoose = require('mongoose'),
    logger = require('../../app/Logger')

const createGridFs = (config) => {
    const gridFs = {
        openUploadStream: (fn, handlers) => {
            const db = mongoose.connection.db
            const bucket = new mongodb.GridFSBucket(db, config)
            const writable = bucket.openUploadStream(fn)
            writable
                .on('error', (error) => {
                    logger.error(error.message)
                })
                .on('finish', () => {
                    handlers(writable.id)
                })
            return writable
        }
    }
    return gridFs
}

module.exports = createGridFs