// для валидации req.body
const {body} = require('express-validator')
const bcrypt = require('bcryptjs')
const User = require('../models/user')

exports.registerValidators = [
    body('remail', 'Введите корректный email')
        .isEmail()
        // санитайзер validator.js
        .normalizeEmail()
        .custom(async (value, {req}) => {
            try {
                const user = await User.findOne({email: value})

                if (user) {
                    return Promise.reject('Такой email уже занят')
                }
            } catch(e) {
                console.log(e)
            }
        }),
    body('rpassword')
        .trim()
        .isLength({min: 6}).withMessage('Пароль должен быть не менее 6 символов')
        .isLength({max: 56}).withMessage('Пароль должен быть не более 56 символов')
        .isAlphanumeric().withMessage('Пароль должен состоять из латинских букв и цифр'),
    body('rconfirm')
        .trim()
        .custom((value, {req}) => {
            if (value !== req.body.rpassword) {
                throw new Error('Пароли должны совпадать')
            }

            return true
        }),
    body('rname')
        .trim()
        .isLength({min: 2}).withMessage('Имя должно быть не короче 2 символов')
        .isLength({max: 20}).withMessage('Имя должно быть не длиннее 20 символов')
]

exports.loginValidators = [
    body('lemail', 'Введите корректный email')
        .isEmail()
        .normalizeEmail()
        .custom(async (value, {req}) => {
            try {
                const user = await User.findOne({email: value})

                if (!user) {
                    return Promise.reject('Пользователя с таким email не существует')
                }
            } catch(e) {
                console.log(e)
            }
        }),
    body('lpassword')
        .trim()
        .custom(async (value, {req}) => {
            try {
                const user = await User.findOne({email: req.body.lemail})

                // сравнение зашифрованных паролей в bcrypt
                if (user) {
                    const areSame = await bcrypt.compare(value, user.password)

                    if (!areSame) {
                        return Promise.reject('Неверный пароль')
                    }
                }
            } catch(e) {
                console.log(e)
            }
        })
]

exports.resetValidators = [
    body('email', 'Введите корректный email')
        .isEmail()
        .normalizeEmail()
        .custom(async (value, {req}) => {
            try {
                const user = await User.findOne({email: value})

                if (!user) {
                    return Promise.reject('Пользователя с таким email не существует')
                }
            } catch(e) {
                console.log(e)
            }
        })
]

exports.passwordValidators = [
    body('password')
        .trim()
        .isLength({min: 6}).withMessage('Пароль должен быть не менее 6 символов')
        .isLength({max: 56}).withMessage('Пароль должен быть не более 56 символов')
        .isAlphanumeric().withMessage('Пароль должен состоять из латинских букв и цифр')
        .custom(async (value, {req}) => {
            try {
                const user = await User.findOne({
                    _id: req.body.userId,
                    resetToken: req.body.token,
                    resetTokenExp: {$gt: Date.now()}
                })

                if (!user) {
                    Promise.reject('Время жизни токена истекло')
                }
            } catch(e) {
                console.log(e)
            }
        })
]

exports.courseValidators = [
    body('title')
        .trim()
        .isLength({min: 2}).withMessage('Минимальная длина названия 2 символа'),
    body('price')
        .isNumeric().withMessage('Введите корректную цену'),
    body('img', 'Введите корректный URL картинки')
        .isURL()
]

exports.profileValidators = [
    body('name')
        .trim()
        .isLength({min: 2}).withMessage('Имя должно быть не короче 2 символов')
        .isLength({max: 20}).withMessage('Имя должно быть не длиннее 20 символов')
]