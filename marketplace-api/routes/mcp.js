import { Router } from 'express'
import { Developer, Game } from '../db/models.js'
import { requireApiKey } from '../middleware/auth.js'

const router = Router()

// GET /mcp (SSE) → 200
router.get('/', requireApiKey, async (req, res) => {
  const dev = await Developer.findOne({ where: { api_key: req.apiKey } })
  if (!dev || !dev.mcp_enabled) return res.status(403).json({ message: 'MCP not enabled' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write('data: ' + JSON.stringify({ type: 'connected', tools: Object.keys(MCP_TOOLS) }) + '\n\n')

  const hb = setInterval(() => res.write(': heartbeat\n\n'), 30000)
  req.on('close', () => clearInterval(hb))
})

// POST /mcp/call → 200 | 400 | 403
router.post('/call', requireApiKey, async (req, res) => {
  const dev = await Developer.findOne({ where: { api_key: req.apiKey } })
  if (!dev) return res.status(403).json({ message: 'Invalid API key' })

  const { tool, args = {} } = req.body
  if (!MCP_TOOLS[tool]) return res.status(400).json({ message: `Unknown tool: ${tool}. Available: ${Object.keys(MCP_TOOLS).join(', ')}` })

  try {
    const result = await MCP_TOOLS[tool](args, dev)
    res.status(200).json({ result })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

const MCP_TOOLS = {
  scene_read: async (args, dev) => {
    const game = await Game.findOne({ where: { developer_id: dev.id, slug: args.slug } })
    return game ? { scene: game.project_path || '{}' } : { error: 'Game not found' }
  },
  scene_write: async (args, dev) => {
    await Game.update({ project_path: JSON.stringify(args.scene) }, { where: { developer_id: dev.id, slug: args.slug } })
    return { success: true }
  },
  script_read: async () => ({ script: '// Script placeholder', language: 'javascript' }),
  script_write: async () => ({ success: true }),
  asset_list: async (args, dev) => {
    const games = await Game.findAll({ where: { developer_id: dev.id }, attributes: ['slug', 'name'] })
    return { assets: games.map(g => ({ type: 'game', slug: g.slug, name: g.name })) }
  },
  physics_config: async () => ({ gravity: -18, broadphase: 'SAP', defaultMass: 1 }),
  npc_prompt: async (args) => ({ response: `NPC: "${args.input}"`, emotion: 'neutral', action: 'idle' }),
}

export default router
