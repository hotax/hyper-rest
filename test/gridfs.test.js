const fs = require('fs'),
    path = require('path'),
    mongoose = require('mongoose')

describe('Upload', () => {
    const createGridFs = require('../db/mongoDb/GridFs')
    const fileName = 'foo'
    let testFileName, gridFs

    beforeEach(function (done) {
        testFileName = path.join(__dirname, './testhelper.js')
        return clearDB(done);
    })

    it('仅指定文件名', (done) => {
        gridFs = createGridFs()
        const writable = gridFs.openUploadStream(fileName, (id) => {
            const filesColl = mongoose.connection.db.collection('fs.files')
            const chunksColl = mongoose.connection.db.collection('fs.chunks')
            const files = filesColl.find({
                _id: id
            })
            files.toArray((err, docs) => {
                expect(docs.length).eql(1)
                expect(docs[0].filename).eql(fileName)
                const chunks = chunksColl.find({files_id: id})
                chunks.toArray((err, chunkDocs) => {
                    const data = fs.readFileSync(testFileName).toString('hex')
                    expect(chunkDocs.length).eql(1)
                    expect(chunkDocs[0].data.toString('hex')).eql(data)
                    done()
                })
            })
        })
        const rs = fs.createReadStream(testFileName)
        rs.pipe(writable)
    })

    it('指定Bucket名和长度', (done) => {
        const bucketName = 'pic'
        const chunkSizeBytes = 1000
        gridFs = createGridFs({bucketName, chunkSizeBytes})
        const writable = gridFs.openUploadStream(fileName, (id) => {
            const filesColl = mongoose.connection.db.collection(`${bucketName}.files`)
            const chunksColl = mongoose.connection.db.collection(`${bucketName}.chunks`)
            const files = filesColl.find({
                _id: id
            })
            files.toArray((err, docs) => {
                expect(docs.length).eql(1)
                expect(docs[0].filename).eql(fileName)
                expect(docs[0].chunkSize).eql(chunkSizeBytes)
                const chunks = chunksColl.find({files_id: id})
                chunks.toArray((err, chunkDocs) => {
                    expect(chunkDocs.length).eql(3)
                    done()
                })
            })
        })
        const rs = fs.createReadStream(testFileName)
        rs.pipe(writable)
    })
})