const toUtc = require('../utils/UtcDate').toUtc

describe('Db Entity', () => {
    const ID_NOT_EXIST = '5ce79b99da3537277c3f3b66'
    const createCollection = require('../db/mongoDb/CreateCollection')
    const createSchema = require('../db/mongoDb/CreateSchema')
    let dbModel

    describe('Document middleware', ()=>{   
        const preSave = function (next) {
            calls ++
            next()
        } 
        const postSave = function () {
            calls ++
        } 
        let calls

        before(() => {
            const subDocSchema = createSchema({sfld: String})
            dbModel = createCollection({
                name: 'Fee',
                schema: {
                    fld: String,
                    sda: [subDocSchema],
                    sd: subDocSchema
                },
                pres: {
                    save: preSave
                },
                posts: {
                    save: postSave
                }
            })
        })

        beforeEach((done) => {
            return clearDB(done);
        })

        it('pre and post save', ()=> {
            calls = 0 
            let id       
            const model = new dbModel({fld: 'foo', sda: [{sfld: 'a1'}, {sfld: 'a2'}], sd: {sfld: 'bbb'}})
            return model.save()
            .then(doc => {
                doc = doc.toJSON()
                id = doc.id
                expect(doc.fld).eql('foo')
                expect(calls).eqls(2)
            })
            .catch(e => {
                throw e
            })
        })
    })

    describe('Entity', () => {
        let entityConfig, entity
        const toCreate = {
            fld: 'foo'
        }
        const createEntity = require('../db/mongoDb/DbEntity')

        before(() => {
            const subDocSchema = createSchema({sfld: String, otherfld: String})
            const complexSubDocSchema = createSchema({sfld: String, sub: [subDocSchema]})
            dbModel = createCollection({
                name: 'Foo',
                schema: {
                    fld: String,
                    fld1: String,
                    type: Number,
                    sub: [subDocSchema],
                    csub: [complexSubDocSchema]
                },
                indexes: [{
                        index: {
                            fld: 1
                        },
                        options: {
                            unique: true
                        }
                    },
                    {
                        index: {
                            fld1: 1,
                            type: 1
                        },
                        options: {
                            unique: true
                        }
                    }
                ]
            })
        })

        beforeEach((done) => {
            entityConfig = {
                schema: dbModel,
                updatables: ['fld']
            }
            entity = createEntity(entityConfig)
            return clearDB(done);
        })

        describe('If-Match', () => {
            it('版本不一致', () => {
                return dbSave(dbModel, toCreate)
                    .then((doc) => {
                        return entity.ifMatch(doc.id, -1)
                    })
                    .then((result) => {
                        expect(result).false;
                    });
            })

            it('一致', () => {
                return dbSave(dbModel, toCreate)
                    .then((doc) => {
                        return entity.ifMatch(doc.id, doc.__v.toString())
                    })
                    .then((result) => {
                        expect(result).true;
                    });
            });
        })

        describe('ifUnmodifiedSince', () => {
            it('自指定时间以来已发生改变', () => {
                return dbSave(dbModel, toCreate)
                    .then((doc) => {
                        const utc = new Date(2019, 5, 1).toUTCString()
                        return entity.ifUnmodifiedSince(doc.id, utc)
                    })
                    .then((result) => {
                        expect(result).false;
                    });
            })

            it('自指定时间以来未改变', () => {
                return dbSave(dbModel, toCreate)
                    .then((doc) => {
                        return entity.ifUnmodifiedSince(doc.id, toUtc(doc.updatedAt))
                    })
                    .then((result) => {
                        expect(result).true;
                    });
            });
        })

        describe('update', () => {
            let doc, version, updatedAt

            beforeEach(() => {
                return dbSave(dbModel, toCreate)
                    .then((d) => {
                        version = d.__v
                        updatedAt = d.updatedAt
                        doc = d
                    })
            })

            it('版本不一致时不做更新', () => {
                return entity.update({
                        id: doc.id,
                        __v: 2
                    })
                    .then((doc) => {
                        expect(doc).not.exist;
                    });
            });

            it('更新时必须保证版本一致', () => {
                return entity.update({
                        id: doc.id,
                        __v: version,
                        fld: 'fld'
                    })
                    .then((doc) => {
                        expect(doc.fld).eqls('fld')
                        expect(doc.updatedAt > updatedAt).true
                    });
            });

            it('删除字段值', () => {
                return entity.update({
                        id: doc.id,
                        __v: version
                    })
                    .then((doc) => {
                        expect(doc.fld).undefined
                        expect(doc.updatedAt > updatedAt).true
                    });
            });

            it('以空字串删除字段值', () => {
                return entity.update({
                        id: doc.id,
                        __v: version,
                        fld: ''
                    })
                    .then((doc) => {
                        expect(doc.fld).undefined
                        expect(doc.updatedAt > updatedAt).true
                    });
            });

            it('可以定义一个字段更新逻辑', () => {
                const setvalues = (doc, data) => {
                    doc.fld = 'fee'
                    expect(data.fld).eqls('fld')
                }
                entityConfig.setValues = setvalues
                return entity.update({
                        id: doc.id,
                        __v: version,
                        fld: 'fld'
                    })
                    .then((doc) => {
                        expect(doc.fld).eqls('fee')
                        expect(doc.updatedAt > updatedAt).true
                    });
            });
        })

        describe('search', () => {
            beforeEach(() => {
                entityConfig.searchables = ['fld', 'fld1']
            })

            it('文档中无任何搜索字段', () => {
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({}, '.')
                    })
                    .then(data => {
                        expect(data.length).eqls(0)
                    })
            })

            it('无条件搜索时文档中无任何搜索字段', () => {
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({}, '')
                    })
                    .then(data => {
                        expect(data.length).eqls(1)
                    })
            })

            it('搜索字段包括fld, fld1', () => {
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld: '弹簧垫片螺母'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld: 'fee',
                    fld1: '弹簧垫片螺母'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld: 'fee1',
                    fld1: 'spec1'
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({
                            type: 1
                        }, '垫片')
                    })
                    .then(data => {
                        expect(data.length).eqls(2)
                    })
            })

            it('不区分大小写', () => {
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'foo',
                    fld: '弹簧垫片螺母'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'fuu',
                    fld: 'fEe'
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({
                            type: 1
                        }, 'Fee')
                    })
                    .then(data => {
                        expect(data.length).eqls(1)
                    })
            })

            it('可以使用通配符‘.’匹配一个字', () => {
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'foo',
                    fld: '弹簧垫片螺母'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'fuu',
                    fld: '弹螺母垫片螺'
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({
                            type: 1
                        }, '弹.垫')
                    })
                    .then(data => {
                        expect(data.length).eqls(1)
                    })
            })

            it('可以使用通配符‘*’', () => {
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'foo',
                    fld: '弹簧垫片螺母'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'fuu',
                    fld: '弹螺母垫片螺'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'fee',
                    fld: 'fEe'
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({
                            type: 1
                        }, '弹*垫')
                    })
                    .then(data => {
                        expect(data.length).eqls(2)
                    })
            })

            it('无条件', () => {
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'foo',
                    fld: '弹簧垫片螺母'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'fuu',
                    fld: '弹螺母垫片螺'
                }))
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'fee',
                    fld: 'fEe'
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({}, '')
                    })
                    .then(data => {
                        expect(data.length).eqls(3)
                    })
            })

            it('配置排序', () => {
                entityConfig.sort = {type: -1}
                let saves = []
                saves.push(dbSave(dbModel, {
                    type: 1,
                    fld1: 'foo',
                    fld: '弹簧垫片螺母'
                }))
                saves.push(dbSave(dbModel, {
                    type: 2,
                    fld1: 'fuu',
                    fld: '弹螺母垫片螺'
                }))
                saves.push(dbSave(dbModel, {
                    type: 3,
                    fld1: 'fee',
                    fld: 'fEe'
                }))
                return Promise.all(saves)
                    .then(() => {
                        return entity.search({}, '')
                    })
                    .then(data => {
                        expect(data[0].type).eql(3)
                        expect(data[2].type).eql(1)
                    })
            })

            it('可以配置查询列表所不包含的字段', () => {
                entityConfig.listable = '-fld -csub -sub -__v -createdAt -updatedAt' //'fld1, type'
                return dbSave(dbModel, {
                        type: 1,
                        fld1: 'fee',
                        fld: 'fEe'
                    })
                    .then(() => {
                        return entity.search({fld: 'fEe'}, '')
                    })
                    .then(data => {
                        expect(data.length).eqls(1)
                        delete data[0].id
                        expect(data[0]).eql({
                            type: 1,
                            fld1: 'fee'
                        })
                    })
            })

            it('可以配置查询列表所包含的字段', () => {
                entityConfig.listable = 'fld1 type'
                return dbSave(dbModel, {
                        type: 1,
                        fld1: 'fee',
                        fld: 'fEe'
                    })
                    .then(() => {
                        return entity.search({fld: 'fEe'}, '')
                    })
                    .then(data => {
                        expect(data.length).eqls(1)
                        delete data[0].id
                        expect(data[0]).eql({
                            type: 1,
                            fld1: 'fee'
                        })
                    })
            })

            describe('可以配置查询列表的记录数', () => {
                let saves

                beforeEach(() => {
                    saves = []
                    saves.push(dbSave(dbModel, {
                        type: 1,
                        fld1: 'foo',
                        fld: '弹簧垫片螺母'
                    }))
                    saves.push(dbSave(dbModel, {
                        type: 1,
                        fld1: 'fuu',
                        fld: '弹螺母垫片螺'
                    }))
                    saves.push(dbSave(dbModel, {
                        type: 1,
                        fld1: 'fee',
                        fld: 'fEe'
                    }))
                })

                it('通过环境变量配置全局', () => {
                    process.env.QUERY_LIST_LINES_LIMIT = '2'
                    return Promise.all(saves)
                        .then(() => {
                            return entity.search({}, '')
                        })
                        .then(data => {
                            expect(data.length).eqls(2)
                        })
                })

                it('配置单个业务实体，且优先于全局配置', () => {
                    process.env.QUERY_LIST_LINES_LIMIT = '2'
                    entityConfig.queryListLinesLimit = 1
                    return Promise.all(saves)
                        .then(() => {
                            return entity.search({}, '')
                        })
                        .then(data => {
                            expect(data.length).eqls(1)
                        })
                })
            })
        })

        describe('listSubs', () => {
            const subFld = 'sub'
            let id

            beforeEach(() => {
                id = '5c349d1a6cf8de3cd4a5bc2c'
            })

            it('文档不存在', () => {
                return entity.listSubs(id)
                    .then(list => {
                        expect(list).undefined
                    })
            })

            it('子文档字段不存在', () => {
                return dbSave(dbModel, toCreate)
                    .then(doc => {
                        id= doc.id
                        return entity.listSubs(id, 'notexist')
                    })
                    .then(list => {
                        expect(list).undefined
                    })
            })

            it('子文档不存在', () => {
                return dbSave(dbModel, toCreate)
                    .then(doc => {
                        id= doc.id
                        return entity.listSubs(id, subFld)
                    })
                    .then(list => {
                        expect(list).eql([])
                    })
            })

            it('正确', () => {
                return new dbModel({fld: 'foo', sub: [{sfld: 'foo'}]}).save()
                    .then(doc => {
                        id= doc.id
                        return entity.listSubs(id, subFld)
                    })
                    .then(list => {
                        expect(list[0].sfld).eql('foo')
                    })
            })
        })

        describe('findById', () => {

            it('未找到', () => {
                const idNotExist = '5c349d1a6cf8de3cd4a5bc2c'
                return entity.findById(idNotExist)
                    .then(data => {
                        expect(data).not.exist
                    })

            })

            describe('记录存在', ()=>{
                it('缺省输出指定记录的所有字段', () => {
                    let doc
                    return dbSave(dbModel, toCreate)
                        .then(data => {
                            doc = data
                            return entity.findById(doc.id)
                        })
                        .then(data => {
                            expect(data).eqls(doc)
                        })
                })

                it('可以指定不输出的字段', () => {
                    let doc
                    entityConfig.projection = '-fld'
                    return dbSave(dbModel, toCreate)
                        .then(data => {
                            doc = data
                            return entity.findById(doc.id)
                        })
                        .then(data => {
                            delete doc.fld
                            expect(data).eqls(doc)
                        })
                })
            })

        })

        describe('create', () => {
            it('新增', () => {
                let docCreated
                return entity.create(toCreate)
                    .then(data => {
                        docCreated = data
                        return dbModel.findById(docCreated.id)
                    })
                    .then(doc => {
                        expect(doc.toJSON()).eqls(docCreated)
                    })
            })

            it('记录重复', () => {
                return dbSave(dbModel, toCreate)
                    .then(data => {
                        return entity.create(toCreate)
                    })
                    .then(() => {
                        should.fail('Failed when come here ')
                    })
                    .catch(err => {
                        expect(err.code).eqls(11000)
                    })
            })
        })

        describe('delete', () => {
            it('删除', () => {
                let doc
                return dbSave(dbModel, toCreate)
                    .then(data => {
                        doc = data
                        return entity.remove(doc.id)
                    })
                    .then((data) => {
                        expect(data).true
                        return dbModel.count()
                    })
                    .then((data) => {
                        expect(data).eqls(0)
                    })
            })

            it('未找到', () => {
                return dbSave(dbModel, toCreate)
                    .then((data) => {
                        return dbSave(dbModel, {
                            type: 2,
                            fld: 'fee'
                        })
                    })
                    .then(() => {
                        return entity.remove(ID_NOT_EXIST)
                    })
                    .then((data) => {
                        expect(data).undefined
                    })
            })
        })

        describe('findSubDocById', () => {
            const subField = 'sub'
            let doc

            beforeEach(() => {
                return dbSave(dbModel, {...toCreate, sub:[{sfld: 'foo', otherfld: 'fee'}]})
                    .then(data => {
                        doc = data
                    })
            })

            it('any exception', () => {
                return entity.findSubDocById('abc')
                    .should.be.rejectedWith()
            })

            it('未找到', () => {
                return entity.findSubDocById(ID_NOT_EXIST, subField, doc[subField][0].id)
                    .then(data => {
                        expect(data).not.exist
                    })

            })

            it('未找到子文档', () => {
                return entity.findSubDocById(doc.id, subField, ID_NOT_EXIST)
                    .then(data => {
                        expect(data).not.exist
                    })

            })

            it('子文档存在', () => {
                return entity.findSubDocById(doc.id, subField, doc[subField][0].id)
                    .then(data => {
                        expect(data).eql({
                            Foo: doc.id,
                            id: doc[subField][0].id,
                            sfld: 'foo',
                            otherfld: 'fee',
                            __v: doc.__v,
                            updatedAt: doc.updatedAt
                        })
                    })
            })
        })

        describe('createSubDoc', () => {
            let id, __v

            beforeEach(() => {
                return dbSave(dbModel, toCreate)
                .then(doc => {
                    id = doc.id
                    __v = doc.__v
                })
            })

            it('any exception', () => {
                return entity.createSubDoc('abc')
                    .should.be.rejectedWith()
            })

            it('parent doc is not found', () => {
                return entity.createSubDoc(ID_NOT_EXIST)
                    .then(doc => {
                        expect(doc).not.exist
                    })
            })

            it('create sub', () => {
                let subDoc
                return entity.createSubDoc(id, 'sub', {sfld: 'foo'})
                    .then(doc => {
                        subDoc = doc
                        return dbModel.findById(id)
                    })
                    .then(doc => {
                        doc = doc.toJSON()
                        expect(subDoc).eql({
                            Foo: doc.id,
                            id: doc.sub[0].id,
                            sfld: 'foo',
                            updatedAt: doc.updatedAt,
                            __v: __v + 1
                        })
                    })
            })
        })

        describe('updateSubDoc', () => {
            const updatedVal = 'updated'
            let doc, toUpdate
            beforeEach(() => {
                return dbSave(dbModel, {...toCreate, sub:[{sfld: 'foo', otherfld: 'fee'}]})
                    .then((d) => {
                        doc = d
                        toUpdate = {
                            id: doc.sub[0].id,
                            Foo: doc.id,
                            __v: doc.__v,
                            sfld: updatedVal,
                            otherfld: updatedVal
                        }
                    })
            })

            it('any exception', () => {
                toUpdate.Foo = 'abc'
                return entity.updateSubDoc('sub', toUpdate)
                    .should.be.rejectedWith()
            })

            it('sub field not exist', () => {
                return entity.updateSubDoc('subNotExist', toUpdate)
                    .should.be.rejectedWith()
            })

            it('parent doc is not found', () => {
                return entity.updateSubDoc('sub', {})
                    .then(d => {
                        expect(d).not.exist
                    })
            })

            it('subdoc is not found', () => {
                return entity.updateSubDoc('sub', {Foo: doc.id, id: ID_NOT_EXIST})
                    .then(d => {
                        expect(d).not.exist
                    })
            })

            it('版本不一致时不做更新', () => {
                return entity.updateSubDoc('sub', {
                        id: doc.sub[0].id,
                        Foo: doc.id,
                        __v: 2
                    })
                    .then((doc) => {
                        expect(doc).not.exist;
                    })
            })

            describe('成功更新', () => {
                let subDoc, updatedDoc
                function testUpdateSubDoc(data) {
                    return entity.updateSubDoc('sub', data)
                    .then((d) => {
                        subDoc = d
                        return dbModel.findById(doc.id)
                    })
                    .then((d) => {
                        updatedDoc = d.toJSON()
                        expect(subDoc.id).eqls(updatedDoc.sub[0].id)
                        expect(updatedDoc.updatedAt).not.eql(doc.updatedAt)
                        expect(updatedDoc.__v).eqls(doc.__v + 1)
                    })
                } 

                beforeEach(() => {
                    toUpdate = {
                        id: doc.sub[0].id,
                        Foo: doc.id,
                        __v: doc.__v,
                        sfld: updatedVal,
                        otherfld: updatedVal
                    }
                })

                it('更新所有字段', () => {
                    return testUpdateSubDoc(toUpdate)
                        .then(() => {
                            expect(subDoc.sfld).eqls(updatedVal)
                            expect(subDoc.otherfld).eqls(updatedVal)
                        })
                })

                it('指定可更新字段', () => {
                    entityConfig.subUpdatables = {sub: ['sfld']}
                    return testUpdateSubDoc(toUpdate)
                        .then(() => {
                            expect(subDoc.sfld).eqls(updatedVal)
                            expect(subDoc.otherfld).eqls(doc.sub[0].otherfld)
                        })
                })
    
                it('删除字段值', () => {
                    delete toUpdate.otherfld
                    return testUpdateSubDoc(toUpdate)
                        .then(() => {
                            expect(subDoc.sfld).eqls(updatedVal)
                            expect(subDoc.otherfld).not.exist
                        })
                })

                it('以空字串删除字段值', () => {
                    toUpdate.otherfld = ''
                    return testUpdateSubDoc(toUpdate)
                        .then(() => {
                            expect(subDoc.sfld).eqls(updatedVal)
                            expect(subDoc.otherfld).not.exist
                        })
                })
            })
        })

        describe('removeSubDoc', () => {
            const subField = 'sub'
            let doc

            beforeEach(() => {
                return dbSave(dbModel, {...toCreate, sub:[{sfld: 'foo1', otherfld: 'fee1'}, {sfld: 'foo2', otherfld: 'fee2'}]})
                    .then(data => {
                        doc = data
                    })
            })

            it('any exception', () => {
                return entity.removeSubDoc('abc', subField, doc[subField][0].id)
                    .should.be.rejectedWith()
            })

            it('未找到', () => {
                return entity.removeSubDoc(ID_NOT_EXIST, subField, doc[subField][0].id)
                    .then((data) => {
                        expect(data).undefined
                    })
            })

            it('未找到子文档', () => {
                return entity.removeSubDoc(doc.id, subField, ID_NOT_EXIST)
                    .then((data) => {
                        expect(data).undefined
                    })
            })

            it('删除', () => {
                return entity.removeSubDoc(doc.id, subField, doc[subField][0].id)
                    .then((data) => {
                        expect(data).true
                        return dbModel.findById(doc.id)
                    })
                    .then((data) => {
                        data = data.toJSON()
                        expect(data[subField]).eql([{id: doc[subField][1].id, sfld: 'foo2', otherfld: 'fee2'}])
                        expect(data.__v).eql(1)
                    })
            })
        })
    })
})