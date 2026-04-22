import { Router } from 'express'
import multer from 'multer'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Game } from '../db/models.js'
import { requireAuth } from '../middleware/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS = join(__dirname, '..', 'uploads')
mkdirSync(join(UPLOADS, 'assets'), { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, join(UPLOADS, 'assets')),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`)
  }
})
const upload = multer({ storage })

const router = Router()

// GET /projects/:gameId/save → 200 | 404
router.get('/:gameId/save', requireAuth, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.gameId)
    if (!game) return res.status(404).json({ message: 'Game not found' })
    const scene = game.project_path ? JSON.parse(game.project_path) : { entities: [] }
    res.status(200).json({ scene })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// POST /projects/:gameId/save → 201 Created
router.post('/:gameId/save', requireAuth, async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.gameId)
    if (!game) return res.status(404).json({ message: 'Game not found' })
    const { scene } = req.body
    if (!scene) return res.status(400).json({ message: 'scene body required' })
    await game.update({ project_path: JSON.stringify(scene) })
    res.status(201).json({ success: true })
  } catch {
    res.status(500).json({ message: 'Internal server error' })
  }
})

// GET /projects/:gameId/assets → 200
router.get('/:gameId/assets', requireAuth, async (req, res) => {
  res.status(200).json({ assets: [] })
})

// POST /projects/:gameId/assets → 201 Created | 400
router.post('/:gameId/assets', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  res.status(201).json({
    url: `assets/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
  })
})

export default router
