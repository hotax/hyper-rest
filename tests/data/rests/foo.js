/**
 * Created by clx on 2017/10/13.
 */
module.exports = {
    url: '/rests/foo',
    transitions: {
        foo:['data._id'],
        fee:['pathparams.id'],
        fuu:['queryparams.page']
    },
    rest: [
        {
            method: 'Get',
            handler: function (req, res) {
                res.status(200);
                res.json({name: 'foo'});
            }
        }
    ]
}