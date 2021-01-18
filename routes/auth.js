const { Router } = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { validationResult } = require('express-validator')
const nodemailer = require('nodemailer')
const sendgrid = require('nodemailer-sendgrid-transport')
const User = require('../models/user')
const keys = require('../keys')
const regEmail = require('../emails/register')
const resetEmail = require('../emails/reset')
const {
  registerValidators,
  loginValidators,
  resetValidators,
  passwordValidators,
} = require('../utils/validators')

const router = Router()

// Создаем транспортер для отправки email с помощью sendgrid и nodemailer
const transporter = nodemailer.createTransport(
  sendgrid({
    auth: { api_key: keys.SENDGRID_API_KEY },
  })
)

router.get('/login', async (req, res) => {
  const jsonData = req.flash('data')
  const data = jsonData.length > 0 ? JSON.parse(jsonData) : {}

  res.render('auth/login', {
    title: 'Авторизация',
    isLogin: true,
    // сообщение об ошибке по ключу из connect-flash
    loginError: req.flash('loginError'),
    registerError: req.flash('registerError'),
    data,
  })
})

router.get('/logout', async (req, res) => {
  //Удаление сессии
  req.session.destroy(() => {
    res.redirect('/auth/login#login')
  })
})

router.post('/login', loginValidators, async (req, res) => {
  try {
    const { lemail, lpassword } = req.body

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      // статус ошибок валидации
      req.flash('loginError', errors.array()[0].msg)
      req.flash(
        'data',
        JSON.stringify({
          email: lemail,
          password: lpassword,
        })
      )
      return res.status(422).redirect('/auth/login#login')
    }

    const user = await User.findOne({ email: lemail })

    req.session.user = user
    req.session.isAuthenticated = true
    // Чтобы редирект не произошел раньше логики, есть функция save у объекта session
    req.session.save(err => {
      if (err) throw err

      res.redirect('/')
    })
  } catch (e) {
    console.log(e)
  }
})

router.post('/register', registerValidators, async (req, res) => {
  try {
    console.log(req.body)
    const { remail, rpassword, rconfirm, rname } = req.body

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      // статус ошибок валидации
      req.flash('registerError', errors.array()[0].msg)
      req.flash(
        'data',
        JSON.stringify({
          name: rname,
          email: remail,
          password: rpassword,
          confirm: rconfirm,
        })
      )
      return res.status(422).redirect('/auth/login#register')
    }

    // шифруем пароль с помощью bcryptjs
    const hashPassword = await bcrypt.hash(rpassword, 10)
    const user = new User({
      email: remail,
      name: rname,
      password: hashPassword,
      cart: { items: [] },
    })

    // лучше отправлять письмо после редиректа - в фоновом режиме, чтобы не тормозить все приложение
    transporter
      .sendMail(regEmail(remail))
      .then(() => {
        user.save()
      })
      .then(() => {
        res.redirect('/auth/login#login')
      })
      .catch(err => {
        req.flash(
          'registerError',
          'Что-то пошло не так, повторите попытку позже'
        )
        res.redirect('/auth/login#register')
      })
  } catch (e) {
    console.log(e)
  }
})

router.get('/reset', (req, res) => {
  const jsonData = req.flash('data')
  const data = jsonData.length > 0 ? JSON.parse(jsonData) : {}

  res.render('auth/reset', {
    title: 'Забыли пароль?',
    error: req.flash('error'),
    data,
  })
})

router.post('/reset', resetValidators, (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg)
      req.flash('data', JSON.stringify({ email: req.body.email }))
      // статус ошибок валидации
      return res.status(422).redirect('/auth/reset')
    }

    // генерируем случайный ключ, дальше выполняем callback
    crypto.randomBytes(32, async (err, buffer) => {
      if (err) {
        req.flash('error', 'Что-то пошло не так, повторите попытку позже')
        return res.redirect('/auth/reset')
      }

      const token = buffer.toString('hex')

      const user = await User.findOne({ email: req.body.email })

      user.resetToken = token
      // Время жизни токена (+1 час)
      user.resetTokenExp = Date.now() + 60 * 60 * 1000

      transporter
        .sendMail(resetEmail(user.email, token))
        .then(() => {
          user.save()
        })
        .then(() => {
          res.redirect('/auth/login#login')
        })
        .catch(err => {
          req.flash(
            'loginError',
            'Что-то пошло не так, повторите попытку позже'
          )
          res.redirect('/auth/login#login')
        })
    })
  } catch (e) {
    console.log(e)
  }
})

router.get('/password/:token', async (req, res) => {
  if (!req.params.token) {
    return res.redirect('/auth/login#login')
  }

  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      // Дата окончания токена должна быть больше $gt настоящей даты
      resetTokenExp: { $gt: Date.now() },
    })

    if (!user) {
      return res.redirect('/auth/login#login')
    } else {
      const jsonData = req.flash('data')
      const data = jsonData.length > 0 ? JSON.parse(jsonData) : {}

      res.render('auth/password', {
        title: 'Задать пароль',
        error: req.flash('error'),
        // 2 поля для дополнительной защиты при пост запросе
        userId: user._id.toString(),
        token: req.params.token,
        data,
      })
    }
  } catch (e) {
    console.log(e)
  }
})

router.post('/password', passwordValidators, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      req.flash('loginError', errors.array()[0].msg)
      req.flash('data', JSON.stringify({ password: req.body.password }))
      // статус ошибок валидации
      return res.status(422).redirect('/auth/login#login')
    }

    const user = await User.findOne({
      _id: req.body.userId,
      resetToken: req.body.token,
      resetTokenExp: { $gt: Date.now() },
    })

    user.password = await bcrypt.hash(req.body.password, 10)
    user.resetToken = undefined
    user.resetTokenExp = undefined

    await user.save()
    res.redirect('/auth/login#login')
  } catch (e) {
    console.log(e)
  }
})

module.exports = router
