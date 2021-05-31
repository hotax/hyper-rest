const _ = require('lodash'),
mongoose = require('mongoose')

let testTarget

describe('Utils', function () {
	beforeEach(function () {})

	describe('CompileProgram', () => {
		let str

		beforeEach(function () {
			testTarget = require('../utils/StringToJavascript')
		})

		it('无效字符串程序', () => {
			str =
				`{
				process: [
					{id: "foo"
					{id: "fee"}
				]
			 }
			`
			expect(() => {
				testTarget(str)
			}).to.throw()
		})

		it('正确转换', () => {
			str =
				`{
				process: [
					{id: "foo"},
					{id: "fee"}
				]
			 }
			`
			expect(testTarget(str)).eql({
				process: [{
						id: 'foo'
					},
					{
						id: 'fee'
					},
				]
			})
		})
	})

	describe('Object2JSON', () => {
		const strObjectId = '5ce79b99da3537277c3f3b66'
		let anInstanceOfObjectID

		beforeEach(function () {
			anInstanceOfObjectID = mongoose.Types.ObjectId(strObjectId);
			testTarget = require('../utils/O2JSON')
		})

		it('create ObjectId', () => {
			const id = testTarget.createObjectId(strObjectId)
			expect(id.toString()).eql(strObjectId)
		})

		describe('toJSON', () => {
			const aDate = new Date()
			it('包含Date', () => {
				const jsonObj = testTarget.convertToJSON({
					foo: aDate,
					fee: {}
				})
				expect(jsonObj).eql({
					foo: aDate.toJSON(),
					fee: {}
				})
			})

			it('包含ObjectId', () => {
				const jsonObj = testTarget.convertToJSON({
					foo: anInstanceOfObjectID,
					fee: {}
				})
				expect(jsonObj).eql({
					foo: strObjectId,
					fee: {}
				})
			})

			it('_id to id', () => {
				const jsonObj = testTarget.convertToJSON({
					_id: anInstanceOfObjectID,
					fee: {}
				})
				expect(jsonObj).eql({
					id: strObjectId,
					fee: {}
				})
			})

			it('remove some keys', () => {
				const jsonObj = testTarget.convertToJSON({
					fee: {},
					foo: []
				}, ['foo'])
				expect(jsonObj).eql({
					fee: {}
				})
			})
		})
	})
})