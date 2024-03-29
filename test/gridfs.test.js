const fs = require('fs'),
    path = require('path'),
    mongoose = require('mongoose')

describe('GridFs', () => {
    const ID_NOT_EXIST = '5ce79b99da3537277c3f3b66',
        fileName = 'foo',
        createGridFs = require('../db/mongoDb/GridFs')

    let testFileName, gridFs, rs, bucketName
    let filesColl, chunksColl

    /* beforeEach(function (done) {
        bucketName = 'fs'
        testFileName = path.join(__dirname, './testhelper.js')
        gridFs = createGridFs()
        rs = fs.createReadStream(testFileName)
        return clearDB(() => {
            filesColl = mongoose.connection.db.collection(`${bucketName}.files`)
            chunksColl = mongoose.connection.db.collection(`${bucketName}.chunks`)
            done()
        })
    }) */
    beforeEach(function () {
        bucketName = 'fs'
        testFileName = path.join(__dirname, './testhelper.js')
        gridFs = createGridFs()
        rs = fs.createReadStream(testFileName)
        return clearDB()
            .then(() => {
                filesColl = mongoose.connection.db.collection(`${bucketName}.files`)
                chunksColl = mongoose.connection.db.collection(`${bucketName}.chunks`)
            })
    })

    describe('Upload', () => {
        it('仅指定文件名', () => {
            return gridFs.upload(rs, fileName)
                .then(id => {
                    id = mongoose.Types.ObjectId(id)
                    const files = filesColl.find({
                        _id: id
                    })
                    files.toArray((err, docs) => {
                        expect(docs.length).eql(1)
                        expect(docs[0].filename).eql(fileName)
                        const chunks = chunksColl.find({
                            files_id: id
                        })
                        chunks.toArray((err, chunkDocs) => {
                            const data = fs.readFileSync(testFileName).toString('hex')
                            expect(chunkDocs.length).eql(1)
                            expect(chunkDocs[0].data.toString('hex')).eql(data)
                        })
                    })
                })
        })

        it('指定Bucket名和长度', () => {
            bucketName = 'pic'
            const chunkSizeBytes = 1000
            gridFs = createGridFs({
                bucketName,
                chunkSizeBytes
            })
            return gridFs.upload(rs, fileName)
                .then(id => {
                    filesColl = mongoose.connection.db.collection(`${bucketName}.files`)
                    chunksColl = mongoose.connection.db.collection(`${bucketName}.chunks`)
                    id = mongoose.Types.ObjectId(id)
                    const files = filesColl.find({
                        _id: id
                    })
                    files.toArray((err, docs) => {
                        expect(docs.length).eql(1)
                        expect(docs[0].filename).eql(fileName)
                        expect(docs[0].chunkSize).eql(chunkSizeBytes)
                        const chunks = chunksColl.find({
                            files_id: id
                        })
                        chunks.toArray((err, chunkDocs) => {
                            expect(chunkDocs.length).eql(3)
                        })
                    })
                })
        })
    })

    describe('remove', () => {
        let picId

        beforeEach(() => {
            return gridFs.upload(rs, fileName)
                .then(id => {
                    picId = id
                })
        })

        it('not found', () => {
            return gridFs.remove(ID_NOT_EXIST)
                .should.be.rejectedWith()
        })

        it('remove', () => {
            return gridFs.remove(picId)
                .then(() => {
                    const files = filesColl.find({_id: picId})
                    files.toArray((err, docs) => {
                        expect(docs.length).eql(0)
                        const chunks = chunksColl.find({_id: picId})
                        chunks.toArray((err, docs) => {
                            expect(docs.length).eql(0)
                        })
                    })
                })
        })

        it('download', () => {
            let buf = ''
            const ds = gridFs.openDownloadStream(picId)
            ds.on('data', (data) => {
                buf = buf + data
            })
            ds.on('end', () => {
                const d = fs.readFileSync(testFileName).toString()
                expect(d).eql(buf)
            })
        })
    })
})