import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'
import { User } from '../db/models.js'
import { sendConfirmationEmail, sendWelcomeEmail } from '../utils/mailer.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication requests. Try again later.' },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many account creation attempts. Try again later.' },
})

router.use(authLimiter)

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

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: '7d' }
  )
}

function safeUser(u) {
  return {
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    role: u.role,
    is_verified: Number(u.is_verified) === 1,
  }
}

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80)
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidPassword(value) {
  return typeof value === 'string'
    && value.length >= 8
    && /[a-z]/i.test(value)
    && /\d/.test(value)
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function newConfirmationToken() {
  return randomBytes(32).toString('hex')
}

async function verifyHCaptcha(hcaptchaToken, remoteIp) {
  const secret = process.env.HCAPTCHA_SECRET
  const bypass = process.env.HCAPTCHA_BYPASS
  console.log(`[hCaptcha] Verifying. Bypass: ${bypass}, Token: ${hcaptchaToken ? 'present' : 'missing'}`)
  
  if (!secret || bypass === '1') {
    console.log('[hCaptcha] Bypassing verification')
    return true
  }
  if (!hcaptchaToken) return false

  const body = new URLSearchParams({
    secret,
    response: String(hcaptchaToken),
  })
  if (remoteIp) body.set('remoteip', remoteIp)

  const response = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error(`hCaptcha verification failed with ${response.status}`)
  const result = await response.json()
  return result?.success === true
}

async function issueConfirmation(user) {
  const token = newConfirmationToken()
  await user.update({
    email_confirm_token_hash: hashToken(token),
    email_confirm_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
  await sendConfirmationEmail(user.email, user.prenom || user.nom, token)
  return token
}

function canExposeDevConfirmationToken() {
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  return process.env.NODE_ENV !== 'production' && (!smtpConfigured || process.env.EXPOSE_DEV_CONFIRMATION_TOKEN === '1')
}

function assertCanSignIn(user, res) {
  if (Number(user.is_banned) === 1) {
    res.status(403).json({ message: 'Account is blocked' })
    return false
  }
  if (Number(user.is_verified) !== 1) {
    res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please confirm your email before signing in.',
    })
    return false
  }
  return true
}

// POST /auth/register -> 201 Created
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const nom = cleanName(req.body.nom)
    const prenom = cleanName(req.body.prenom)
    const email = cleanEmail(req.body.email)
    const { password, birthday, hcaptchaToken } = req.body

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields: nom, prenom, email, password' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' })
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number' })
    }
    if (birthday && Number.isNaN(Date.parse(birthday))) {
      return res.status(400).json({ message: 'Invalid birthday' })
    }

    const captchaOk = await verifyHCaptcha(hcaptchaToken, req.ip)
    if (!captchaOk) {
      console.warn(`[hCaptcha] Verification failed. Token: ${hcaptchaToken ? 'present' : 'missing'}`)
      return res.status(400).json({ message: 'hCaptcha verification failed' })
    }

    const existing = await User.findOne({ where: { email } })
    if (existing) return res.status(409).json({ message: 'Email already registered' })

    const hash = await bcrypt.hash(password, 12)
    const user = await User.create({
      nom,
      prenom,
      email,
      password_hash: hash,
      birthday: birthday || null,
      is_verified: 0,
    })

    const confirmToken = await issueConfirmation(user)
    res.status(201).json({
      message: 'Account created. Check your email to confirm your registration.',
      user: safeUser(user),
      ...(canExposeDevConfirmationToken() ? { devConfirmationToken: confirmToken } : {}),
    })
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /auth/confirm-email -> 200 OK
router.post('/confirm-email', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim()
    if (!token || token.length < 32) {
      return res.status(400).json({ message: 'Invalid confirmation token' })
    }

    const user = await User.findOne({ where: { email_confirm_token_hash: hashToken(token) } })
    if (!user) return res.status(400).json({ message: 'Invalid confirmation token' })
    if (user.email_confirm_expires_at && new Date(user.email_confirm_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Confirmation token has expired' })
    }

    await user.update({
      is_verified: 1,
      email_confirm_token_hash: null,
      email_confirm_expires_at: null,
    })
    await sendWelcomeEmail(user.email, user.prenom || user.nom)

    res.status(200).json({ message: 'Email confirmed. Welcome to GameForge.' })
  } catch (err) {
    console.error('[auth/confirm-email]', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /auth/resend-confirmation -> 200 OK
router.post('/resend-confirmation', registerLimiter, async (req, res) => {
  try {
    const email = cleanEmail(req.body.email)
    const { hcaptchaToken } = req.body
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email address' })

    const captchaOk = await verifyHCaptcha(hcaptchaToken, req.ip)
    if (!captchaOk) {
      console.warn(`[hCaptcha] Verification failed. Token: ${hcaptchaToken ? 'present' : 'missing'}`)
      return res.status(400).json({ message: 'hCaptcha verification failed' })
    }

    const user = await User.findOne({ where: { email } })
    if (user && Number(user.is_verified) !== 1 && Number(user.is_banned) !== 1) {
      await issueConfirmation(user)
    }
    res.status(200).json({ message: 'If the account exists and is not confirmed, a new confirmation email has been sent.' })
  } catch (err) {
    console.error('[auth/resend-confirmation]', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /auth/login -> 200 OK
router.post('/login', async (req, res) => {
  try {
    const email = cleanEmail(req.body.email)
    const { password, hcaptchaToken } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const captchaOk = await verifyHCaptcha(hcaptchaToken, req.ip)
    if (!captchaOk) {
      console.warn(`[hCaptcha] Verification failed. Token: ${hcaptchaToken ? 'present' : 'missing'}`)
      return res.status(400).json({ message: 'hCaptcha verification failed' })
    }

    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })
    if (!assertCanSignIn(user, res)) return

    const token = signToken(user)
    // Set a cookie for SSO between localhost ports. 
    // SameSite: 'Lax' allows it to be sent on top-level navigations and some cross-site requests.
    res.setHeader('Set-Cookie', `nexus_token=${token}; Path=/; Max-Age=${60*60*24*7}; SameSite=Lax`)
    res.status(200).json({ token, user: safeUser(user) })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /auth/me -> 200 OK
router.get('/me', async (req, res) => {
  try {
    let token = ''
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else if (req.headers.cookie) {
      // Basic cookie parsing since we don't use cookie-parser
      const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
        const [k, v] = c.trim().split('=')
        if (k && v) acc[k] = v
        return acc
      }, {})
      token = cookies['nexus_token']
    }

    if (!token) return res.status(401).json({ message: 'No token' })
    
    const payload = jwt.verify(token, jwtSecret())
    const user = await User.findByPk(payload.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (!assertCanSignIn(user, res)) return
    
    // If we authenticated via cookie, let the frontend know the token too
    res.status(200).json({ user: safeUser(user), token })
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
})

// POST /auth/refresh -> 200 OK
router.post('/refresh', async (req, res) => {
  try {
    const { token: oldToken } = req.body
    if (!oldToken) return res.status(400).json({ message: 'Token required' })
    const payload = jwt.verify(oldToken, jwtSecret(), { ignoreExpiration: true })
    const user = await User.findByPk(payload.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (!assertCanSignIn(user, res)) return
    res.status(200).json({ token: signToken(user) })
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
})

export default router
