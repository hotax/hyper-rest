const { expect } = require('chai')
const { schema } = require('../jwt/WxSessionsMongoDbSchema')

describe('权限管理', function () {
	const ID_NOT_EXIST = '5ce79b99da3537277c3f3b66'
	const Schema = require('../usermgr/UsersMongoDbSchema'),
		userId = 'foo',
		name = 'foo name',
		password = 'wwwpsd',
		openid = 'openid',
		email = 'foo@qq.com',
		roles = 'user roles',
		pic = 'user pic'
	const DEFAULT_ADMIN_ID = '$$$$defaultuserid$$admin',
		DEFAULT_ADMIN = { id: DEFAULT_ADMIN_ID,  name: '系统管理员',  isAdmin: true}
		
	let id

	describe('用户', () => {
		const entity = require('../usermgr/Users')

		beforeEach(() => {
			return clearDB();
		})

		// TODO: 注册用户时的数据校验
		it('注册用户', () => {
			const user = {
				userId,
				name,
				password,
				email
			}
			return entity.create(user)
				.then(() => {
					return Schema.findOne({
						userId
					})
				})
				.then((doc) => {
					expect(user).eql({
						userId: doc.userId,
						name: doc.name,
						password: doc.password,
						email: doc.email
					})
					expect(!doc.inUse).true
					expect(!doc.isAdmin).true
					expect(!doc.roles).true
				})
		})

		describe('认证', () => {
			const user = { userId, name,  password,  openid, isAdmin: false, roles, pic, inUse: true }

			beforeEach(function () {
				return dbSave(Schema, user)
					.then(doc=>{
						id = doc.id
					})
			})

			it('账号不一致，未获认证', () => {
				return entity.authenticate('unknown', password)
					.then((theUser) => {
						expect(theUser).undefined
					})
			})

			it('密码不一致，未获认证', () => {
				return entity.authenticate(userId, 'wrong')
					.then((theUser) => {
						expect(theUser).undefined
					})
			})

			it('未启用', () => {
				return Schema.findById(id)
					.then(doc=>{
						doc.inUse = undefined
						return doc.save()
					})
					.then(() => {
						return entity.authenticate(userId, password)
					})
					.then((theUser) => {
						expect(theUser).undefined
					})
			})

			it('账号密码一致，且已启用用户可获认证', () => {
				return entity.authenticate(userId, password)
					.then((theUser) => {
						expect(theUser).eql({ id,  name,  openid, pic,  isAdmin: false,  roles,  userId })
					})
			})

			it('缺省系统管理员', () => {
				return entity.authenticate('@admin@', '$9999$')
					.then((user) => {
						expect(user).eql(DEFAULT_ADMIN)
					})
			})

			it('已存在系统管理员， 缺省系统管理员无效', () => {
				return Schema.findById(id)
					.then(doc=>{
						doc.isAdmin = true
						return doc.save()
					})
					.then(() => {
						return entity.authenticate('@admin@', '$9999$')
					})
					.then((theUser) => {
						expect(theUser).undefined
					})
			})
		})

		describe('按特定类型进行搜索', () => {
			let save
			beforeEach(() => {
				let records = []
				records.push(dbSave(Schema, {
					userId: 'userId1',
					name: 'user1'
				}))
				records.push(dbSave(Schema, {
					userId: 'userId2',
					name: 'user2',
					inUse: true
				}))
				records.push(dbSave(Schema, {
					userId: 'userId3',
					name: 'user3',
					inUse: false
				}))
				records.push(dbSave(Schema, {
					userId: 'userId4',
					name: 'user4',
					isAdmin: true
				}))
				records.push(dbSave(Schema, {
					userId: 'userId5',
					name: 'user5',
					isAdmin: false
				}))
				save = Promise.all(records)
			})

			it('所有 - ALL', () => {
				return save
					.then(() => {
						return entity.search({TYPE: 'ALL'})
					})
					.then((users) => {
						expect(users.length).eql(5)
					})
			})

			it('非用户 - NONUSER', () => {
				return save
					.then(() => {
						return entity.search({TYPE: 'NONUSER'})
					})
					.then((users) => {
						expect(users.length).eql(3)
					})
			})

			it('用户 - ALLUSER', () => {
				return save
					.then(() => {
						return entity.search({TYPE: 'ALLUSER'})
					})
					.then((users) => {
						expect(users.length).eql(2)
					})
			})

			it('系统管理员 - ADMIN', () => {
				return save
					.then(() => {
						return entity.search({TYPE: 'ADMIN'})
					})
					.then((users) => {
						expect(users.length).eql(1)
					})
			})

			it('非系统管理员用户 - NONADMINUSER', () => {
				return save
					.then(() => {
						return entity.search({TYPE: 'NONADMINUSER'})
					})
					.then((users) => {
						expect(users.length).eql(1)
					})
			})
		})

		describe('获得用户信息', ()=>{
			const user = { userId, name,  password,  openid, isAdmin: false, roles, pic, inUse: true }

			beforeEach(function () {
				return dbSave(Schema, user)
					.then(doc=>{
						id = doc.id
					})
			})

			it('缺省系统管理员', () => {
				return entity.getUser(DEFAULT_ADMIN_ID)
					.then((user) => {
						expect(user).eql({
							isAdmin: true
						})
					})
			})

			it('普通用户', () => {
				return entity.getUser(id)
					.then((data) => {
						expect(data).eql({id, userId, name,  openid, isAdmin: false, roles, pic, inUse: true})
					})
			})

			it('未找到用户', () => {
				return entity.getUser(ID_NOT_EXIST)
					.then((data) => {
						expect(data).undefined
					})
			})
		})

		describe('微信用户', ()=>{
			const UNKNOWN_WECHAT_NAME = "Unknown Wechat User"
			it('创建新的微信用户', () => {
				return entity.createWechatUser({openid})
					.then((doc) => {
						expect(doc).eql({id: doc.id, name: UNKNOWN_WECHAT_NAME,  openid, 
							__v: doc.__v, createdAt: doc.createdAt, updatedAt: doc.updatedAt})
					})
			})

			it('微信用户已绑定业务用户', () => {
				return dbSave(Schema, {name, openid})
					.then(doc=>{
						id = doc.id
						return entity.createWechatUser({openid})
					})
					.then((doc) => {
						expect(doc).eql({id, name,  openid, 
							__v: doc.__v, createdAt: doc.createdAt, updatedAt: doc.updatedAt})
					})
			})

			it('微信用户已绑定指定业务用户', () => {
				return dbSave(Schema, {name, openid})
					.then(doc=>{
						id = doc.id
						return entity.createWechatUser({id, openid})
					})
					.then((doc) => {
						expect(doc).eql({id, name,  openid, 
							__v: doc.__v, createdAt: doc.createdAt, updatedAt: doc.updatedAt})
					})
			})

			it('指定业务用户未绑定任何微信用户， 微信用户也未绑定任何业务用户', () => {
				return dbSave(Schema, {name})
					.then(doc=>{
						id = doc.id
						return entity.createWechatUser({id, openid})
					})
					.then((doc) => {
						expect(doc).eql({id, name,  openid, 
							__v: doc.__v, createdAt: doc.createdAt, updatedAt: doc.updatedAt})
					})
			})

			it('一个微信用户只能绑定一个业务用户', () => {
				const feename = 'fee'
				let feeid
				return dbSave(Schema, {name: feename, openid})
					.then(doc=>{
						feeid = doc.id
						return dbSave(Schema, {name})
					})
					.then((doc) => {
						id = doc.id
						return entity.createWechatUser({id, openid})
					})
					.should.be.rejectedWith()
			})

			it('指定用户未找到', () => {
				return entity.createWechatUser({id:ID_NOT_EXIST, openid})
					.should.be.rejectedWith()
			})
		})
	})
})