const logger = require('../app/Logger')

module.exports = (str) => {
    try {
        const script = ` "use strict"; return (${str})`
        return Function(script)()
    }catch(e) {
        logger.error(`Invalid rockstar program: ${e.message}\r\n${e.stack}`)
        throw e
    }
}