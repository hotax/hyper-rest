/**
 * Created by clx on 2017/10/29.
 */
const Promise = require('bluebird');

module.exports = {
    setResourcesNameList: function (nameList) {
    },
    findTransitions: function (resourceId, context, req) {
        var trans = {
            Home: {
                "login": "Roles",
                "search specifications": "SpecificationSearch",
                "add specification": "Specifications"
            },
            Roles: {
                Cashier: "Cashier",
                Barista: "Barista"
            },
            Cashier:{
                "place order": 'OrdersFulfillment',
                "review order": 'FindOrderToFulfill'
            },
            OrderToFulfillForCashier: {
                edit: "OrderToFulfill",
                cancel: "OrderToFulfill"
            },
            Barista:{
                "select order": "OrdersToFulfill"
            },
            OrderToFulfillForBarista: {
                reverse: "OrderToFulfill"
            },
            SpecificationSearch: {
                add: 'Specifications'
            },
            Specifications:{
                search: 'SpecificationSearch'
            },
            Specification: {
                self: "Specification",
                update: 'Specification',
                delete: 'Specification',
                search: 'SpecificationSearch'
            }
        };
        return Promise.resolve(trans[resourceId]);
    }
}
