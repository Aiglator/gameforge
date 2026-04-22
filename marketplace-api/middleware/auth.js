import jwt from 'jsonwebtoken'
import { User } from '../db/models.js'

let warnedJwtSecret = false
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production')
  }
  if (!warnedJwtSecret) {
    warnedJwtSecret = true
    console.warn('[auth] JWT_SECRET is not set. Using an unsafe local-dev fallback.')
  }
  return 'gameforge-local-dev-secret-change-me'
}

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), jwtSecret())
    const user = await User.findByPk(payload.id)
    if (!user) return res.status(401).json({ message: 'Invalid token' })
    if (Number(user.is_banned) === 1) return res.status(403).json({ message: 'Account is blocked' })
    if (Number(user.is_verified) !== 1) return res.status(403).json({ message: 'Please confirm your email before continuing.' })
    req.user = payload
    req.userRecord = user
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

export function requireApiKey(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('ApiKey ')) {
    return res.status(401).json({ message: 'API key required' })
  }
  req.apiKey = auth.slice(7)
  next()
}

export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), jwtSecret())
    } catch { /* ignore */ }
  }
  next()
}
