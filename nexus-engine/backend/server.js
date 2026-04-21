/**
 * Nexus Engine — Backend Server
 * Express + WebSocket + AI bridge
 */

import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import {
  readFileSync, writeFileSync, unlinkSync,
  mkdirSync, existsSync, readdirSync
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 3001
const PROJECTS_DIR = join(__dirname, '..', 'projects')

if (!existsSync(PROJECTS_DIR)) mkdirSync(PROJECTS_DIR, { recursive: true })

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'] }))
app.use(express.json({ limit: '10mb' }))

// ── HTTP Routes ──────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: Date.now() })
})

app.get('/api/scenes', (_req, res) => {
  try {
    const files = readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'))
    res.json(files.map(f => ({ name: f.replace('.json', ''), file: f })))
  } catch {
    res.json([])
  }
})

app.post('/api/scenes/:name', (req, res) => {
  try {
    const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const path = join(PROJECTS_DIR, `${name}.json`)
    writeFileSync(path, JSON.stringify(req.body, null, 2))
    res.json({ ok: true, path })
    console.log(`[API] Scene saved: ${name}`)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('/api/scenes/:name', (req, res) => {
  try {
    const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const path = join(PROJECTS_DIR, `${name}.json`)
    if (!existsSync(path)) return res.status(404).json({ error: 'Scene not found' })
    res.json(JSON.parse(readFileSync(path, 'utf-8')))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.delete('/api/scenes/:name', (req, res) => {
  try {
    const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const path = join(PROJECTS_DIR, `${name}.json`)
    if (existsSync(path)) unlinkSync(path)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// AI command endpoint (broadcasts to all WS clients)
app.post('/api/ai/command', (req, res) => {
  const { prompt, context } = req.body ?? {}
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' })
  const commands = parseAIPrompt(prompt, context)
  broadcast({ type: 'ai_commands', payload: commands })
  res.json({ ok: true, commands })
})

// ── WebSocket ─────────────────────────────────────────────────────
const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set()

function broadcast(msg) {
  const data = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) client.send(data)
  }
}

wss.on('connection', (ws, req) => {
  clients.add(ws)
  console.log(`[WS] Client connected (${clients.size} total) from ${req.socket.remoteAddress}`)
  ws.send(JSON.stringify({ type: 'welcome', payload: { version: '1.0.0', ts: Date.now() } }))

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    handleWSMessage(ws, msg)
  })

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`[WS] Client disconnected (${clients.size} total)`)
  })

  ws.on('error', (err) => console.error('[WS] Error:', err.message))
})

function handleWSMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', payload: { ts: Date.now() } }))
      break

    case 'console_log':
      console.log(`[Client]`, msg.payload)
      break

    case 'ai_prompt': {
      const commands = parseAIPrompt(msg.payload?.prompt ?? '', msg.payload?.context)
      ws.send(JSON.stringify({ type: 'ai_commands', payload: commands }))
      // Also broadcast so all clients see the AI-driven changes
      broadcast({ type: 'ai_commands', payload: commands })
      break
    }

    default:
      // Relay to all other clients (collaboration)
      for (const client of clients) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify(msg))
        }
      }
  }
}

/**
 * Simple NLP parser — maps natural language to engine commands.
 * Extend this to call Claude API for real AI integration.
 */
function parseAIPrompt(prompt = '', _context) {
  const p = prompt.toLowerCase()
  const commands = []

  if (/add|create|spawn|place/.test(p)) {
    if (/cube|box/.test(p))     commands.push({ type: 'create_entity', payload: { type: 'cube',     name: 'Cube'     } })
    if (/sphere|ball/.test(p))  commands.push({ type: 'create_entity', payload: { type: 'sphere',   name: 'Sphere'   } })
    if (/cylinder/.test(p))     commands.push({ type: 'create_entity', payload: { type: 'cylinder', name: 'Cylinder' } })
    if (/plane|ground/.test(p)) commands.push({ type: 'create_entity', payload: { type: 'plane',    name: 'Ground'   } })
    if (/light/.test(p))        commands.push({ type: 'create_entity', payload: { type: 'light',    name: 'Light'    } })
    if (/camera/.test(p))       commands.push({ type: 'create_entity', payload: { type: 'camera',   name: 'Camera'   } })
  }

  if (/\bplay\b|\bstart\b|\brun\b/.test(p)) commands.push({ type: 'play', payload: {} })
  if (/\bstop\b|\bpause\b/.test(p))         commands.push({ type: 'stop', payload: {} })

  if (commands.length === 0) {
    commands.push({
      type: 'ai_response',
      payload: { message: `Command not recognized: "${prompt}". Try: "add cube", "spawn light", "play", "stop"` }
    })
  }

  return commands
}

// ── Start ─────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Nexus Engine Backend`)
  console.log(`   HTTP  → http://localhost:${PORT}`)
  console.log(`   WS    → ws://localhost:${PORT}/ws`)
  console.log(`   API   → http://localhost:${PORT}/api/health`)
  console.log(`   Dir   → ${PROJECTS_DIR}\n`)
})

httpServer.on('error', (err) => {
  console.error('[Server] Error:', err.message)
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the existing process or change the port.`)
  }
})
