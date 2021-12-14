const schema = require('./WxSessionsMongoDbSchema'),
	createEntity = require('../db/mongoDb/DbEntity'),
	logger = require('../app/Logger');

const config = {
	schema
}

const addIn = {
	removeToken: (token)=>{
		return schema.deleteOne({
			token
		})
		.then((data) => {
			if (data.n === 0 && data.deletedCount === 0) {
				logger.debug(`The token ${token} is not found in session, nothing was removed`)
				return
			}
			logger.debug(`Remove token: deleteCount=${data.deletedCount} ok=${data.ok}`)
		})
	}
}

module.exports = createEntity(config, addIn)