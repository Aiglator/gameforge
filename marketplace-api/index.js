import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

import { syncAndSeed } from './db/models.js'
import authRouter      from './routes/auth.js'
import gamesRouter     from './routes/games.js'
import projectsRouter  from './routes/projects.js'
import purchasesRouter from './routes/purchases.js'
import developerRouter from './routes/developer.js'
import mcpRouter       from './routes/mcp.js'
import adminRouter     from './routes/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3003

const app = express()

mkdirSync(join(__dirname, 'uploads', 'games'),   { recursive: true })
mkdirSync(join(__dirname, 'uploads', 'assets'),  { recursive: true })

app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3003', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/static', express.static(join(__dirname, 'uploads', 'games')))
app.use('/static/assets', express.static(join(__dirname, 'uploads', 'assets')))

// Health check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), orm: 'sequelize', db: 'sqlite' }))

app.use('/api/auth',      authRouter)
app.use('/api/games',     gamesRouter)
app.use('/api/projects',  projectsRouter)
app.use('/api/purchases', purchasesRouter)
app.use('/api/developer', developerRouter)
app.use('/api/mcp',       mcpRouter)
app.use('/api/admin',     adminRouter)

// 404 handler
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }))

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message)
  res.status(500).json({ message: 'Internal server error' })
})

// Start after DB sync
syncAndSeed()
  .then(() => {
    app.listen(PORT, () => console.log(`[GameForge API] http://localhost:${PORT} — Sequelize/SQLite ready`))
  })
  .catch(err => {
    console.error('[DB] Failed to sync:', err)
    process.exit(1)
  })
