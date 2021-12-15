const schema = require('./WxSessionsMongoDbSchema'),
	createEntity = require('../db/mongoDb/DbEntity'),
	logger = require('../app/Logger');

const entity = createEntity({schema}, {})

const obj = {
	create: ({token, openid, session_key, userId})=>{
		return schema.findOne({openid})
			.then(doc=>{
				if(!doc) return entity.create({token, openid, session_key, userId})
				doc.token = token
				doc.session_key = session_key
				doc.userId = userId
				return doc.save()
			})
	},
	findByOpenId: (openid)=>{
		return schema.findOne({openid})
			.then(doc=>{
				if(!doc) return
				const {openid, session_key, userId} = doc.toJSON()
				return {openid, session_key, userId}
			})
	},
	removeToken: (token)=>{
		return schema.deleteOne({
			token
		})
		.then((data) => {
			if (data.n === 0 && data.deletedCount === 0) {
				logger.debug(`The token ${token} is not found in session, nothing was removed`)
			}
			else
				logger.debug(`Remove token: deleteCount=${data.deletedCount} ok=${data.ok}`)
		})
	}
}


module.exports = obj