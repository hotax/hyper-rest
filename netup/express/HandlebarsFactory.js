/**
 * Created by clx on 2017/10/18.
 */
const exphbs = require('express-handlebars');

module.exports = function (name, viewsDir, settings) {
    var engineName = name;
    var views = viewsDir;
    var engineSettings = settings;

    return {
        attachTo: function (app) {
            app.set('views', views);
            var settings = {
                partialsDir: views + '/partials',
                extname: '.' + engineName
            };
            if(engineSettings){
                if(engineSettings.partialsDir) settings.partialsDir = engineSettings.partialsDir;
                if(engineSettings.extname) settings.extname = engineSettings.extname;
                if(engineSettings.helpers) settings.helpers = engineSettings.helpers;
            }
            app.engine(engineName, exphbs.create(settings).engine);
            app.set('view engine', engineName);
        }
    }
}