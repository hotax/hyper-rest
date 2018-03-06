const app = require('./tradeup'),
    cluster = require('cluster'),
    os = require('os');

var log4js = require('log4js');
log4js.configure("log4js.conf", {reloadSecs: 300});
var logger = log4js.getLogger();

require('dotenv').config();

if(process.env.DEVELOPMENT){
    app();
    return;
}