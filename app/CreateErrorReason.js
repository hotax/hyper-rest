module.exports = function (code, msg) {
    return {
        sendStatusTo: function (res) {
            res.status(code);
            res.send(msg);
        }
    }
}