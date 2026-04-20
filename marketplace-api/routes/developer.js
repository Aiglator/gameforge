import { Router } from 'express'
import { randomBytes } from 'crypto'
import { Developer, Game, User } from '../db/models.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /developer/keys → 200 | 404
router.get('/keys', requireAuth, async (req, res) => {
  try {
    const dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev) return res.status(404).json({ message: 'Not a developer. POST /api/developer/become first.' })
    res.status(200).json({ api_key: dev.api_key, plan: dev.plan })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /developer/keys/regenerate → 200 OK
router.post('/keys/regenerate', requireAuth, async (req, res) => {
  try {
    let dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev) {
      dev = await Developer.create({ user_id: req.user.id })
      await User.update({ role: 'developer' }, { where: { id: req.user.id } })
    }
    const key = `ngf_${randomBytes(24).toString('hex')}`
    await dev.update({ api_key: key })
    res.status(200).json({ api_key: key })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /developer/analytics → 200 | 404
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev) return res.status(404).json({ message: 'Not a developer' })
    const games = await Game.findAll({ where: { developer_id: dev.id } })
    const totalPlayers = games.reduce((s, g) => s + g.player_count, 0)
    const estimatedRevenue = Math.round(games.reduce((s, g) => s + g.player_count * g.price * 0.7, 0) * 100) / 100
    res.status(200).json({ games: games.length, totalPlayers, estimatedRevenue, plan: dev.plan })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /developer/become → 201 Created | 200 Already exists
router.post('/become', requireAuth, async (req, res) => {
  try {
    const existing = await Developer.findOne({ where: { user_id: req.user.id } })
    if (existing) return res.status(200).json({ message: 'Already a developer', api_key: existing.api_key })
    const key = `ngf_${randomBytes(24).toString('hex')}`
    const dev = await Developer.create({ user_id: req.user.id, api_key: key })
    await User.update({ role: 'developer' }, { where: { id: req.user.id } })
    res.status(201).json({ message: 'Developer account created', api_key: key })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
