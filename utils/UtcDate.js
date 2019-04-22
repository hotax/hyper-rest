const moment = require('moment'),
DATE_RFC2822 = 'ddd, DD MMM YYYY HH:mm:ss [GMT]'

module.exports = {
    toUtc: (dateStr) => {
        let date = moment(dateStr)
        return date.utc().format(DATE_RFC2822);
    }
}