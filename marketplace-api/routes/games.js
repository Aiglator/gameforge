import { Router } from 'express'
import { Op } from 'sequelize'
import { Game, Developer, User } from '../db/models.js'
import { randomBytes } from 'crypto'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const router = Router()

// GET /games → 200 OK
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, q, sort = 'recent', limit = 50, offset = 0 } = req.query
    const where = { status: 'published' }
    if (category) where.category = category
    if (q) where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
    ]
    const order = sort === 'popular'    ? [['player_count', 'DESC']]
                : sort === 'price_asc'  ? [['price', 'ASC']]
                : sort === 'price_desc' ? [['price', 'DESC']]
                : [['created_at', 'DESC']]
    const games = await Game.findAll({ where, order, limit: Number(limit), offset: Number(offset) })
    res.status(200).json({ games })
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /games/mine → 200 OK (developer's own games, all statuses)
// MUST be before /:slug so Express doesn't swallow "mine" as a slug
router.get('/mine', requireAuth, async (req, res) => {
  try {
    let dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev) return res.status(200).json({ games: [] })
    const games = await Game.findAll({ where: { developer_id: dev.id }, order: [['created_at', 'DESC']] })
    res.status(200).json({ games })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /games/:slug → 200 OK | 404 Not Found
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const game = await Game.findOne({ where: { slug: req.params.slug } })
    if (!game) return res.status(404).json({ message: 'Game not found' })
    res.status(200).json({ game })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /games → 201 Created | 400 | 409
router.post('/', requireAuth, async (req, res) => {
  try {
    let dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev) {
      const key = `ngf_${randomBytes(24).toString('hex')}`
      dev = await Developer.create({ user_id: req.user.id, api_key: key })
      await User.update({ role: 'developer' }, { where: { id: req.user.id } })
    }

    const { name, slug, description, category, price = 0, project_path, thumbnail } = req.body
    if (!name || !slug) return res.status(400).json({ message: 'Fields required: name, slug' })
    if (!/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ message: 'slug must be lowercase letters, numbers and hyphens only' })

    const game = await Game.create({
      developer_id: dev.id,
      name,
      slug,
      description: description || '',
      category: category || 'Other',
      price,
      project_path: project_path || null,
      thumbnail: thumbnail || null
    })
    res.status(201).json({ game })
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'Slug already taken' })
    res.status(500).json({ message: 'Internal server error' })
  }
})

// PATCH /games/:id → 200 OK | 400 | 403 | 404
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id)
    if (!game) return res.status(404).json({ message: 'Game not found' })
    const dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev || game.developer_id !== dev.id) return res.status(403).json({ message: 'Forbidden' })

    const { name, description, category, price, project_path, thumbnail } = req.body
    if (price !== undefined && (isNaN(price) || price < 0))
      return res.status(400).json({ message: 'price must be a non-negative number' })

    await game.update({
      name: name ?? game.name,
      description: description ?? game.description,
      category: category ?? game.category,
      price: price ?? game.price,
      project_path: project_path !== undefined ? project_path : game.project_path,
      thumbnail: thumbnail !== undefined ? thumbnail : game.thumbnail,
    })
    res.status(200).json({ game })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// PUT /games/:id/publish → 200 OK | 403 | 404
router.put('/:id/publish', requireAuth, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id)
    if (!game) return res.status(404).json({ message: 'Game not found' })
    const dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev || game.developer_id !== dev.id) return res.status(403).json({ message: 'Forbidden' })
    await game.update({ status: 'published' })
    res.status(200).json({ message: 'Game published', game })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// DELETE /games/:id → 204 No Content | 403 | 404
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id)
    if (!game) return res.status(404).json({ message: 'Game not found' })
    const dev = await Developer.findOne({ where: { user_id: req.user.id } })
    if (!dev || game.developer_id !== dev.id) return res.status(403).json({ message: 'Forbidden' })
    await game.destroy()
    res.status(204).send()
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /games/:slug/play → 204 No Content (side-effect, no body)
router.post('/:slug/play', async (req, res) => {
  try {
    await Game.increment('player_count', { where: { slug: req.params.slug } })
    res.status(204).send()
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
