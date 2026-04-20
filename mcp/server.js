#!/usr/bin/env node
// ─── mcp/server.js ────────────────────────────────────────────────────────────
// Serveur MCP pour le moteur de jeux communautaire.
// • Écoute les commandes MCP de Claude (stdio)
// • Relaie les commandes au navigateur via WebSocket (ws://localhost:3001)
//
// Installation : cd mcp && npm install
// Lancement    : node server.js
// Claude Desktop config (claude_desktop_config.json) :
//   { "mcpServers": { "game-engine": { "command": "node", "args": ["<chemin>/mcp/server.js"] } } }

import { McpServer }           from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer }      from 'ws';
import { z }                    from 'zod';

// ── WebSocket bridge vers le navigateur ─────────────────────────────────────
const wss = new WebSocketServer({ port: 3001 });
let browser = null;

wss.on('connection', ws => {
  browser = ws;
  console.error('[MCP] Navigateur connecté sur ws://localhost:3001');
  ws.on('close',   () => { browser = null; console.error('[MCP] Navigateur déconnecté'); });
  ws.on('error',   err => console.error('[MCP] WS erreur:', err.message));
});

/**
 * Envoie une commande au navigateur et attend la réponse.
 * @param {object} cmd — { cmd, ...params }
 * @param {number} timeout — ms
 */
function sendToBrowser(cmd, timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!browser || browser.readyState !== 1) {
      reject(new Error('Navigateur non connecté — ouvrez http://localhost/eemi/js/ dans Chrome'));
      return;
    }
    const id = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timer = setTimeout(() => {
      browser.off('message', handler);
      reject(new Error('Timeout — le navigateur n\'a pas répondu'));
    }, timeout);

    function handler(raw) {
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return; }
      if (data.id !== id) return;
      clearTimeout(timer);
      browser.off('message', handler);
      if (data.error) reject(new Error(data.error));
      else resolve(data.result);
    }

    browser.on('message', handler);
    browser.send(JSON.stringify({ id, ...cmd }));
  });
}

// ── Réponse helper ───────────────────────────────────────────────────────────
const text = str => ({ content: [{ type: 'text', text: String(str) }] });

// ── Serveur MCP ──────────────────────────────────────────────────────────────
const server = new McpServer({
  name:    'game-engine',
  version: '1.0.0',
});

// ┌─────────────────────────────────────────────────────────────────────────────
// │ ENTITIES
// └─────────────────────────────────────────────────────────────────────────────

server.tool(
  'create_entity',
  'Crée une entité dans la scène (cube, sphere, cylinder, plane, light, camera).',
  {
    name: z.string().describe('Nom de l\'entité'),
    type: z.enum(['cube','sphere','cylinder','plane','light','camera']).optional().default('cube'),
    x:   z.number().optional().default(0),
    y:   z.number().optional().default(1),
    z:   z.number().optional().default(0),
    tag: z.string().optional().describe('Tag pour IA/triggers (ex: player, enemy)'),
  },
  async ({ name, type, x, y, z: pz, tag }) => {
    const r = await sendToBrowser({ cmd: 'create_entity', name, type, x, y, z: pz, tag });
    return text(`Entité "${r.name}" créée (id: ${r.id})`);
  }
);

server.tool(
  'list_entities',
  'Liste toutes les entités de la scène courante.',
  {},
  async () => {
    const entities = await sendToBrowser({ cmd: 'list_entities' });
    if (!entities.length) return text('Aucune entité dans la scène.');
    const lines = entities.map(e =>
      `• ${e.name} (${e.id}) tag="${e.tag}" pos=(${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)}, ${e.position.z.toFixed(1)}) composants=[${e.components.join(', ')}]`
    );
    return text(lines.join('\n'));
  }
);

server.tool(
  'set_entity_color',
  'Change la couleur d\'une entité mesh.',
  {
    entityId: z.string().describe('ID de l\'entité'),
    color:    z.string().describe('Couleur hex (#rrggbb)'),
  },
  async ({ entityId, color }) => {
    await sendToBrowser({ cmd: 'set_entity_color', entityId, color });
    return text(`Couleur de ${entityId} → ${color}`);
  }
);

// ┌─────────────────────────────────────────────────────────────────────────────
// │ SCRIPTING
// └─────────────────────────────────────────────────────────────────────────────

server.tool(
  'set_script',
  'Définit le script JavaScript d\'une entité (fonctions onStart, onUpdate, onCollision).',
  {
    entityId: z.string().describe('ID de l\'entité'),
    code:     z.string().describe('Code JavaScript avec onStart(api, entity), onUpdate(api, entity, dt), etc.'),
  },
  async ({ entityId, code }) => {
    await sendToBrowser({ cmd: 'set_script', entityId, code });
    return text(`Script défini pour ${entityId}`);
  }
);

// ┌─────────────────────────────────────────────────────────────────────────────
// │ IA & TRIGGERS
// └─────────────────────────────────────────────────────────────────────────────

server.tool(
  'add_behavior',
  'Ajoute un comportement IA à une entité (patrol, chase, guardian, echo, idle).',
  {
    entityId:        z.string(),
    behaviorType:    z.enum(['patrol','chase','guardian','echo','idle']).optional().default('patrol'),
    speed:           z.number().optional().default(3),
    detectionRadius: z.number().optional().default(10),
    attackRadius:    z.number().optional().default(2),
    targetTag:       z.string().optional().default('player'),
  },
  async ({ entityId, behaviorType, speed, detectionRadius, attackRadius, targetTag }) => {
    await sendToBrowser({ cmd: 'add_behavior', entityId, behaviorType, speed, detectionRadius, attackRadius, targetTag });
    return text(`Comportement "${behaviorType}" ajouté à ${entityId}`);
  }
);

server.tool(
  'add_trigger',
  'Ajoute une zone de déclenchement (AABB) à une entité avec scripts onEnter/onExit.',
  {
    entityId: z.string(),
    sizeX:    z.number().optional().default(2),
    sizeY:    z.number().optional().default(2),
    sizeZ:    z.number().optional().default(2),
    onEnter:  z.string().optional().default('').describe('Code JS exécuté quand une entité entre'),
    onExit:   z.string().optional().default('').describe('Code JS exécuté quand une entité sort'),
    tag:      z.string().optional().default('').describe('Filtre par tag (vide = tout le monde)'),
    oneShot:  z.boolean().optional().default(false),
  },
  async ({ entityId, sizeX, sizeY, sizeZ, onEnter, onExit, tag, oneShot }) => {
    await sendToBrowser({ cmd: 'add_trigger', entityId, size: { x: sizeX, y: sizeY, z: sizeZ }, onEnter, onExit, tag, oneShot });
    return text(`Trigger ajouté à ${entityId}`);
  }
);

// ┌─────────────────────────────────────────────────────────────────────────────
// │ NIVEAUX
// └─────────────────────────────────────────────────────────────────────────────

server.tool(
  'create_level',
  'Crée un nouveau niveau vide dans le projet.',
  { name: z.string().describe('Nom du niveau') },
  async ({ name }) => {
    const r = await sendToBrowser({ cmd: 'create_level', name });
    return text(`Niveau "${r.name}" créé (id: ${r.id})`);
  }
);

server.tool(
  'load_level',
  'Charge un niveau existant (sauvegarde le niveau courant d\'abord).',
  { id: z.string().describe('ID du niveau à charger') },
  async ({ id }) => {
    await sendToBrowser({ cmd: 'load_level', id });
    return text(`Niveau ${id} chargé`);
  }
);

// ┌─────────────────────────────────────────────────────────────────────────────
// │ GÉNÉRATION DE MONDE
// └─────────────────────────────────────────────────────────────────────────────

server.tool(
  'generate_world',
  'Génère un monde procédural (terrain heightmap + arbres + ruines) dans la scène.',
  {
    theme:     z.enum(['post-apo','plains','dungeon']).optional().default('post-apo'),
    seed:      z.number().optional().default(0).describe('0 = aléatoire'),
    width:     z.number().optional().default(80),
    depth:     z.number().optional().default(80),
    treeCount: z.number().optional().default(40),
    ruinCount: z.number().optional().default(10),
  },
  async (params) => {
    const { seed: usedSeed } = await sendToBrowser({ cmd: 'generate_world', params: { ...params, seed: params.seed || undefined } });
    return text(`Monde "${params.theme}" généré (seed: ${usedSeed})`);
  }
);

server.tool(
  'clear_world',
  'Efface le monde procédural généré (terrain, arbres, ruines).',
  {},
  async () => {
    await sendToBrowser({ cmd: 'clear_world' });
    return text('Monde effacé');
  }
);

// ┌─────────────────────────────────────────────────────────────────────────────
// │ SIMULATION
// └─────────────────────────────────────────────────────────────────────────────

server.tool('play_scene', 'Lance la simulation (équivalent bouton Play).', {}, async () => {
  await sendToBrowser({ cmd: 'play' });
  return text('Simulation démarrée');
});

server.tool('stop_scene', 'Arrête la simulation (équivalent bouton Stop).', {}, async () => {
  await sendToBrowser({ cmd: 'stop' });
  return text('Simulation arrêtée');
});

server.tool('save_scene', 'Sauvegarde la scène courante dans un fichier JSON.', {}, async () => {
  await sendToBrowser({ cmd: 'save' });
  return text('Scène sauvegardée');
});

// ── Démarrage ────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[MCP] Serveur démarré — WebSocket sur ws://localhost:3001');
