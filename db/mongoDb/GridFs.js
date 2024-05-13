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
            const objId = new mongoose.Types.ObjectId(id)
            return bucket.delete(objId)
        },
        openDownloadStream: (id) => {
            createBucket()
            id = new mongoose.Types.ObjectId(id)
            return bucket.openDownloadStream(id)
        }
    }
    return gridFs
}

module.exports = createGridFs