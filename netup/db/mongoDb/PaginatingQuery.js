/**
 * Created by clx on 2017/11/3.
 */
module.exports = {
    query: function (options) {
        if (!options || !options.schema) throw 'a query options with db schema should be given';

        var page = options.page ? options.page : 1;
        var perpage = options.perpage ? options.perpage : 10;
        var conditions = options.conditions ? options.conditions : {};
        var handler = options.handler ? options.handler : null;
        var select = options.select ? options.select : null;
        var sort = options.sort ? options.sort : null;

        var result = {
            items: [],
            total: 0,
            page: page,
            perpage: perpage
        };

        var schema = options.schema;
        schema = schema.find(conditions)
            .limit(perpage)
            .skip(perpage * (page - 1));
        if (select) {
            schema = schema.select(select);
        }
        if (sort) {
            schema = schema.sort(sort);
        }
        return schema.exec()
            .then(function (data) {
                var dataAfterHandled = [];
                if (handler) {
                    data.forEach(function (element) {
                        dataAfterHandled.push(handler(element));
                    })
                    data = dataAfterHandled;
                }
                result.items = data;
                return options.schema.count().exec();
            })
            .then(function (data) {
                result.total = data;
                return result;
            })
    }
}