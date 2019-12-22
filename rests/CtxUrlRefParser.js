const _ = require('underscore')

module.exports = (urlPatternToPath) => {
    class __CtxUrlRefParser {
        constructor(req, refKey, constParams) {
            this.req = req
            this.refKey = refKey
            this.constParams = constParams || {}
        }
    
        refUrl(ctx, refExp) {
            const req = this.req,
                constParams = this.constParams,
                refKey = this.refKey
    
            function __doRefUrl(ctx, refExp) {
                let finalRefExp = _.isArray(refExp) ? refExp : [refExp]
                _.each(finalRefExp, (ref) => {
                    const pos = ref.indexOf('.')
                    if (pos < 0) {
                        return __doFieldRefUrl(ctx, ref)
                    }
                    const fld = ref.substr(0, pos)
                    const leftRef = ref.substring(pos + 1)
                    let theCtx = ctx[fld]
                    theCtx = _.isArray(theCtx) ? theCtx : [theCtx]
                    _.each(theCtx, item => {
                        __doRefUrl(item, leftRef)
                    })
                })
            }
    
            function __doFieldRefUrl(ctx, ref) {
                const refVal = ctx[ref]
                if (!refVal) return
                const params = {
                    ...constParams
                }
                params[refKey] = refVal
                const url = urlPatternToPath(req, params)
                ctx[ref] = url
            }
    
            __doRefUrl(ctx, refExp)
        }
    }

    return (req, refKey, constParams) => {
        return new __CtxUrlRefParser(req, refKey, constParams)
    }
}