/**
 * Created by clx on 2017/10/14.
 */
const fs = require('fs'),
    util = require('util'),
    path = require('path'),
    logger = require('../app/Logger');

const DirectoryResourceDescriptorsLoader = function (dir) {
    if (!fs.existsSync(dir)) {
        const errMsg = util.format('The resources descriptions dir[%s] dose not exist!', dir);
        logger.error(errMsg);
        throw new Error(errMsg);
    }
    return {
        loadAll: function () {
            var rests = {};
            var files = fs.readdirSync(dir);
            files.forEach(function (f) {
                const fn = path.join(dir, f);
                if (fs.lstatSync(fn).isFile()) {
                    logger.debug('Loading resource descriptor: ' + fn);
                    const desc = require(fn);
                    const id = f.substr(0, f.lastIndexOf('.')); //去除文件名后缀
                    rests[id] = desc;
                }
            });
            return rests;
        }
    }
}
module.exports = DirectoryResourceDescriptorsLoader;