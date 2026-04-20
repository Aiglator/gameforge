import { Router } from 'express'
import { Purchase, Game } from '../db/models.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /purchases/checkout → 201 Created | 400 | 404
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { game_id } = req.body
    if (!game_id) return res.status(400).json({ message: 'game_id required' })

    const game = await Game.findByPk(game_id)
    if (!game) return res.status(404).json({ message: 'Game not found' })

    if (game.price === 0) {
      const [purchase, created] = await Purchase.findOrCreate({
        where: { user_id: req.user.id, game_id },
        defaults: { amount: 0, type: 'game' }
      })
      return res.status(201).json({ purchase, free: true, already_owned: !created })
    }

    res.status(200).json({
      payment_required: true,
      checkout_url: `https://checkout.stripe.com/pay/placeholder_${game_id}`,
      amount: game.price,
    })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /purchases/webhook → 200 OK (Stripe webhook placeholder)
router.post('/webhook', (req, res) => {
  res.status(200).json({ received: true })
})

// GET /purchases/user → 200 OK
router.get('/user', requireAuth, async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Game, attributes: ['name', 'slug', 'thumbnail'] }],
      order: [['created_at', 'DESC']],
    })
    res.status(200).json({ purchases })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /purchases/check/:gameId → 200 OK
router.get('/check/:gameId', requireAuth, async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      where: { user_id: req.user.id, game_id: req.params.gameId }
    })
    res.status(200).json({ owned: !!purchase })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
