module.exports = (def) => {
    let val = def.control
    let maxAge = (def.maxAge && def.maxAge > 0) ? 'max-age=' + def.maxAge : undefined
    if (val && val.length > 0) {
        if(maxAge) val += ' ' + maxAge    
    } else {
        if(maxAge) val = maxAge
    }

    return val
}