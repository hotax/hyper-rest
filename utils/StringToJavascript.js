const logger = require('../app/Logger')

module.exports = (str) => {
    try {
        const script = ` "use strict"; return (${str})`
        return Function(script)()
    }catch(e) {
        logger.error(`Fail of transforming string into javascript: ${e.message}\r\n${e.stack}`)
        throw e
    }
}