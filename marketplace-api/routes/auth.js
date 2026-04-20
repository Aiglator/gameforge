import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User } from '../db/models.js'

const router = Router()

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function safeUser(u) {
  return { id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role }
}

// POST /auth/register → 201 Created
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, password, birthday } = req.body
    if (!nom || !prenom || !email || !password)
      return res.status(400).json({ message: 'Missing required fields: nom, prenom, email, password' })
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' })

    const existing = await User.findOne({ where: { email } })
    if (existing) return res.status(409).json({ message: 'Email already registered' })

    const hash = await bcrypt.hash(password, 12)
    const user = await User.create({ nom, prenom, email, password_hash: hash, birthday: birthday || null })
    const token = signToken(user)
    // JWT saved in localStorage by the frontend — returned here
    res.status(201).json({ token, user: safeUser(user) })
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /auth/login → 200 OK
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' })

    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })

    const token = signToken(user)
    res.status(200).json({ token, user: safeUser(user) })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /auth/me → 200 OK (token validation for engine reconnect)
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' })
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const user = await User.findByPk(payload.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.status(200).json({ user: safeUser(user) })
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
})

// POST /auth/refresh → 200 OK
router.post('/refresh', async (req, res) => {
  try {
    const { token: oldToken } = req.body
    if (!oldToken) return res.status(400).json({ message: 'Token required' })
    const payload = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true })
    const user = await User.findByPk(payload.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.status(200).json({ token: signToken(user) })
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
})

export default router
