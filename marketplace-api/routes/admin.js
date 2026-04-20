import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { User, Developer, Game, Purchase } from '../db/models.js'
import { Op } from 'sequelize'

const router = Router()

// ── Auth middleware (admin only) ─────────────────────────────────
function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Token manquant' })
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    if (payload.role !== 'admin') return res.status(403).json({ message: 'Accès réservé aux administrateurs' })
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Token invalide' })
  }
}

// ── GET /api/admin/stats — tableau de bord global ────────────────
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalGames, totalPurchases, totalDevs] = await Promise.all([
      User.count(),
      Game.count(),
      Purchase.count(),
      Developer.count(),
    ])
    const bannedUsers = await User.count({ where: { is_banned: 1 } })
    const proDevs = await Developer.count({ where: { plan: 'pro' } })
    const publishedGames = await Game.count({ where: { status: 'published' } })
    const revenue = await Purchase.sum('amount') || 0

    res.json({
      users: { total: totalUsers, banned: bannedUsers },
      games: { total: totalGames, published: publishedGames },
      developers: { total: totalDevs, pro: proDevs },
      purchases: { total: totalPurchases, revenue: parseFloat(revenue.toFixed(2)) },
    })
  } catch (err) {
    console.error('[Admin/stats]', err)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ── GET /api/admin/users — liste paginée ─────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { q, role, plan, status, limit = 20, offset = 0, sort = 'created_at', order = 'DESC' } = req.query

    const where = {}
    if (q) where[Op.or] = [
      { nom:    { [Op.like]: `%${q}%` } },
      { prenom: { [Op.like]: `%${q}%` } },
      { email:  { [Op.like]: `%${q}%` } },
    ]
    if (role)   where.role      = role
    if (status === 'banned')  where.is_banned   = 1
    if (status === 'active')  where.is_banned   = 0
    if (status === 'verified') where.is_verified = 1

    const allowedSort = ['created_at', 'nom', 'email', 'role']
    const safeSort = allowedSort.includes(sort) ? sort : 'created_at'

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Developer, required: false, attributes: ['plan', 'api_key', 'revenue_total', 'mcp_enabled'] }],
      order:  [[safeSort, order === 'ASC' ? 'ASC' : 'DESC']],
      limit:  Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
      attributes: { exclude: ['password_hash'] },
    })

    const games = await Game.findAll({ attributes: ['developer_id', 'id'], raw: true })
    const gameCountMap = {}
    games.forEach(g => { gameCountMap[g.developer_id] = (gameCountMap[g.developer_id] || 0) + 1 })

    const users = rows.map(u => {
      const plain = u.toJSON()
      plain.game_count = u.Developer ? (gameCountMap[u.Developer.id] || 0) : 0
      return plain
    })

    res.json({ users, total: count, limit: parseInt(limit), offset: parseInt(offset) })
  } catch (err) {
    console.error('[Admin/users]', err)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ── GET /api/admin/users/:id — détail utilisateur ────────────────
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Developer, required: false }],
    })
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })

    const games = user.Developer
      ? await Game.findAll({ where: { developer_id: user.Developer.id }, attributes: ['id','name','slug','status','player_count','price'] })
      : []
    const purchases = await Purchase.findAll({ where: { user_id: user.id }, order: [['created_at','DESC']], limit: 10 })

    res.json({ user: user.toJSON(), games, purchases })
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ── PATCH /api/admin/users/:id — modifier rôle/ban/plan ──────────
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { role, is_banned, is_verified, plan } = req.body
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
    if (user.id === req.user.id) return res.status(400).json({ message: 'Impossible de modifier son propre compte via admin' })

    const updates = {}
    if (role      !== undefined) updates.role        = role
    if (is_banned !== undefined) updates.is_banned   = is_banned ? 1 : 0
    if (is_verified !== undefined) updates.is_verified = is_verified ? 1 : 0
    await user.update(updates)

    // Update developer plan if provided
    if (plan !== undefined && user.Developer) {
      await user.Developer.update({ plan })
    }

    const updated = await User.findByPk(user.id, { attributes: { exclude: ['password_hash'] }, include: [Developer] })
    res.json({ user: updated.toJSON() })
  } catch (err) {
    console.error('[Admin/patch user]', err)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ── DELETE /api/admin/users/:id — supprimer (hard delete) ────────
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
    if (user.id === req.user.id) return res.status(400).json({ message: 'Impossible de supprimer son propre compte' })
    await user.destroy()
    res.json({ message: 'Utilisateur supprimé' })
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ── GET /api/admin/games — liste des jeux ────────────────────────
router.get('/games', requireAdmin, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query
    const where = status ? { status } : {}
    const { count, rows } = await Game.findAndCountAll({
      where, limit: parseInt(limit), offset: parseInt(offset),
      include: [{ model: Developer, required: false, include: [{ model: User, attributes: ['nom','prenom','email'] }] }],
      order: [['created_at','DESC']],
    })
    res.json({ games: rows, total: count })
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ── PATCH /api/admin/games/:id — modérer un jeu ──────────────────
router.patch('/games/:id', requireAdmin, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id)
    if (!game) return res.status(404).json({ message: 'Jeu introuvable' })
    const { status } = req.body
    if (status) await game.update({ status })
    res.json({ game })
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
