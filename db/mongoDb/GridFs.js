const mongodb = require('mongodb'),
    mongoose = require('mongoose')

const createGridFs = (config) => {
    let bucket

    const createBucket = () => {
        if (!bucket) {
            const db = mongoose.connection.db
            bucket = new mongodb.GridFSBucket(db, config)
        }
    }
    const gridFs = {
        upload: (readStream, fileName) => {
            return new Promise((resolve, reject) => {
                createBucket()
                const writable = bucket.openUploadStream(fileName)
                writable.on('finish', () => {
                    return resolve(writable.id.toString())
                })
                writable.on('error', (err) => {
                    return reject(err)
                })
                readStream.pipe(writable)
            })
        },
        remove: (id) => {
            createBucket()
            return new Promise((resolve, reject) => {
                id = mongoose.Types.ObjectId(id)
                bucket.delete(id, err => {
                    if (err) {
                        return reject(err)
                    }
                    return resolve()
                })
            })
        },
        openDownloadStream: (id) => {
            createBucket()
            id = mongoose.Types.ObjectId(id)
            return bucket.openDownloadStream(id)
        }
    }
    return gridFs
}

module.exports = createGridFs