const bcrypt = require('bcryptjs')
const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('../db')
const { handle, publicUser, requireUser, signToken } = require('../auth')

const router = express.Router()

// Slows down password guessing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.' },
})

router.post(
  '/login',
  loginLimiter,
  handle(async (req, res) => {
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const password = String(req.body.password ?? '')
    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Wrong email or password.' })
    }
    res.json({ token: signToken(user), user: publicUser(user) })
  }),
)

router.get('/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }))

module.exports = router
