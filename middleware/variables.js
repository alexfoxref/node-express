module.exports = function(req, res, next) {
    // добавляем поле isAuth
    res.locals.isAuth = req.session.isAuthenticated
    // добавляем переменную csrf для использования в формах
    res.locals.csrf = req.csrfToken()

    next()
}