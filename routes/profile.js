const {Router} = require('express')
const auth = require('../middleware/auth')
const User = require('../models/user')
const {profileValidators} = require('../utils/validators')
const {validationResult} = require('express-validator')

const router = Router()

router.get('/', auth, async (req, res) => {
    res.render('profile', {
        title: 'Профиль',
        isProfile: true,
        user: req.user.toObject(),
        error: req.flash('error')
    })
})

router.post('/', auth, profileValidators, async (req, res) => {
    const error = validationResult(req)
    if (!error.isEmpty()) {
        req.flash('error', error.array()[0].msg)
        res.status(422).redirect('/profile')
    }

    try {
        const user = await User.findById(req.user._id)

        const toChange = {
            name: req.body.name
        }

        if (req.file) {
            toChange.avatarUrl = req.file.path
        }

        Object.assign(user, toChange)

        await user.save()
        res.redirect('/profile')
    } catch(e) {
        console.log(e)
    }
})

module.exports = router