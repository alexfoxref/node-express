module.exports = {
    ifeq(a, b, options) {
        //при === проверка не проходит
        if (a == b) {
            return options.fn(this)
        } else {
            return options.inverse(this)
        }
    }
}