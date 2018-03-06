/**
 * Created by clx on 2017/10/14.
 */
const fs = require('fs'),
    path = require('path');

module.exports = {
    loadFrom: function (dir) {
        var rests = {};
        var files = fs.readdirSync(dir);
        files.forEach(function (f) {
            var desc = require(path.join(dir, f));
            var id = f.substr(0, f.lastIndexOf('.'));   //去除文件名后缀
            rests[id] = desc;
        });
        return rests;
    }
}
