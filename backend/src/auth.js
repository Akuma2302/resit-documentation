const jwt = require('jsonwebtoken')
const db = require('./db')
const { toId } = require('./ids')

const TOKEN_LIFETIME = '7d'

function secret() {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set')
  return process.env.SESSION_SECRET
}

function signToken(user) {
  return jwt.sign({ userId: user.id }, secret(), { expiresIn: TOKEN_LIFETIME })
}

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })

// Wraps async handlers so a rejected promise reaches the error handler.
const handle = (fn) => (req, res, next) => fn(req, res, next).catch(next)

// Reads the bearer token and loads the account, so a deactivated user is locked out at once.
const requireUser = handle(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  let payload
  try {
    payload = jwt.verify(token, secret())
  } catch {
    return res.status(401).json({ error: 'Not logged in' })
  }
  const user = await db.user.findUnique({ where: { id: toId(payload.userId) } })
  if (!user || !user.active) return res.status(401).json({ error: 'Not logged in' })
  req.user = user
  next()
})

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' })
  next()
}

module.exports = { signToken, publicUser, handle, requireUser, requireAdmin }
