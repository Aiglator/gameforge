# Nexus Engine — In-Browser 3D Game IDE

A fully-featured browser-based game development environment built on Vue 3, Three.js, and Cannon-es. Create, script, and publish 3D games without leaving the browser.

**Stack:** Vue 3 · TypeScript · Pinia · Vite · Three.js r168 · Cannon-es 0.20.0 · Monaco Editor

---

## Setup

```bash
cd nexus-engine
npm install
npm run dev
```

- Editor IDE runs on **http://localhost:5173**
- Engine backend (asset serving / project API) runs on **http://localhost:3000**

> Requires the Marketplace API on **http://localhost:3004** to publish games.

Nexus Engine is locked when opened directly. The marketplace sends a JWT to the editor iframe with `postMessage`, and the editor validates it against the marketplace API before mounting the workspace.

```bash
cp .env.example .env.local
```

Key variables:
- `VITE_MARKETPLACE_API_URL`: marketplace API used by the frontend auth gate.
- `VITE_MARKETPLACE_ORIGINS`: trusted marketplace origins for `postMessage`.
- `VITE_MARKETPLACE_URL`: login URL used by the locked screen.
- `VITE_NEXUS_BACKEND_WS`: backend WebSocket URL.
- `MARKETPLACE_API_URL`: backend verification endpoint base URL.

---

## Features

- **3D Editor** — Scene graph panel, drag-and-drop object placement, real-time preview
- **Terrain Generation** — Procedural heightmap terrain with configurable noise parameters
- **Skybox** — Cube-map skybox with day/night presets
- **Physics Engine** — Cannon-es rigid body simulation with gravity, colliders, and joints
- **Scripting** — Monaco Editor with TypeScript support; attach scripts to any scene object
- **Asset Library** — Import 3D models (GLTF/GLB), textures, and audio clips
- **Skeleton System** — Bone-based character skeleton builder
- **Publish to Marketplace** — Bundle and upload your game in one click directly to the GameForge marketplace

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Del` | Delete selected object |
| `G` | Translate (move) selected object |
| `R` | Rotate selected object |
| `S` | Scale selected object |
| `Ctrl+Z` | Undo last action |
| `Ctrl+Shift+Z` | Redo |
| `F` | Focus camera on selected object |
| `Space` | Play / Pause physics simulation |

---

## Project Structure

```
nexus-engine/
├── src/
│   ├── components/     # Vue UI panels (SceneGraph, Inspector, Toolbar …)
│   ├── engine/         # Three.js + Cannon-es core (renderer, physics, scripting)
│   ├── stores/         # Pinia stores (scene, project, assets)
│   └── views/          # Main editor view
├── public/             # Static assets
└── backend/            # Express project/asset server (:3000)
```
