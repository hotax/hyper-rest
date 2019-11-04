/**
 * Created by clx on 2017/10/14.
 */
const fs = require('fs'),
    util = require('util'),
    path = require('path'),
    __ = require('underscore'),
    logger = require('../app/Logger');

class DirectoryResourceDescriptorsLoader {
    constructor(dir) {
        if (!fs.existsSync(dir)) {
            const errMsg = util.format('The resources descriptions dir[%s] dose not exist!', dir);
            logger.error(errMsg);
            throw new Error(errMsg);
        }
        this.baseDir = dir
    }

    loadAll() {
        const rests = {},
        dir = this.baseDir,
        files = fs.readdirSync(dir);
        __.each(files, f => {
            const fn = path.join(dir, f);
            if (fs.lstatSync(fn).isFile()) {
                logger.info('Load resource descriptor: ' + fn);
                const desc = require(fn);
                const id = f.substr(0, f.lastIndexOf('.')); //去除文件名后缀
                rests[id] = desc;
            }
        })
        return rests;
    }
}

function create(dir) {
    return new DirectoryResourceDescriptorsLoader(dir)
}
module.exports = create;