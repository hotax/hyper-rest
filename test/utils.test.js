const bodyParser = require('body-parser'),
    requestAgent = require('supertest');

let testTarget

describe('Utils', function () {
    beforeEach(function () {
    })

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
			expect(()=>{
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
                process: [
                    {id: 'foo'},
                    {id: 'fee'},
                ]
            })
		})
	})
})