const mongodb = require('mongodb'),
    mongoose = require('mongoose')

const createGridFs = (config) => {
    config = config || {}
    let db, bucket, filesColl, chunksColl
    let { bucketName } = config
    if (!bucketName) bucketName = 'fs'

    const createBucket = () => {
        if (!bucket) {
            db = mongoose.connection.db
            bucket = new mongodb.GridFSBucket(db, config)
            filesColl = db.collection(`${bucketName}.files`)
            chunksColl = db.collection(`${bucketName}.chunks`)
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
        download: (id) => {
            createBucket()
            id = new mongoose.Types.ObjectId(id)
            return bucket.openDownloadStream(id)
        },
        openDownloadStream: (id) => {
            createBucket()
            id = new mongoose.Types.ObjectId(id)
            return bucket.openDownloadStream(id)
        },
        clearAll: async () => {
            createBucket()
            const cursor = bucket.find();
            for await (const doc of cursor) {
                await bucket.delete(doc._id)
            }
        }
    }
    return gridFs
}

module.exports = createGridFs