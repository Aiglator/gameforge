# GameForge — Moteur de Jeux Communautaire

![Node.js](https://img.shields.io/badge/Node.js-22.x-green?logo=nodedotjs)
![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen?logo=vuedotjs)
![Three.js](https://img.shields.io/badge/Three.js-r168-black?logo=threedotjs)
![SQLite](https://img.shields.io/badge/SQLite-3.x-blue?logo=sqlite)
![License](https://img.shields.io/badge/license-MIT-blue)

A community-driven browser-based game engine and marketplace. Create 3D and 2D games directly in your browser with a fully-featured IDE, publish them to the marketplace, and let players discover and play them instantly — no installation required.

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Nexus Engine IDE   │────▶│  Marketplace API     │◀────│  Marketplace Front  │
│  Vue 3 + Three.js   │     │  Express + SQLite    │     │  Vue 3 + Pinia      │
│  :5173              │     │  :3004               │     │  :3002              │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

- **Nexus Engine** — In-browser 3D/2D game editor with Monaco scripting, terrain generation, skybox, physics simulation, and one-click publish.
- **Marketplace API** — REST API handling authentication, game listings, file uploads, purchases, and MCP integration.
- **Marketplace Frontend** — Player-facing storefront and game launcher built with Vue 3 and TailwindCSS.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Engine Frontend | Vue 3, TypeScript, Pinia, Vite, Three.js r168, Cannon-es 0.20.0, Monaco Editor |
| Marketplace Frontend | Vue 3, Pinia, Vue Router, Vite, TailwindCSS |
| API Backend | Express 4, Sequelize 6, SQLite3, JWT, bcrypt, Multer, nodemailer, express-rate-limit, Stripe |
| Tooling | Vite, ESLint, PostCSS, Autoprefixer |

---

## Quick Start

> Requires **Node.js 18+**. Run each block in a separate terminal from the project root.

**Terminal 1 — Nexus Engine IDE**
```bash
cd nexus-engine && npm install && npm run dev
```
Opens the game editor at http://localhost:5173

**Terminal 2 — Marketplace API**
```bash
cd marketplace-api && npm install && node index.js
```
API available at http://localhost:3004

**Terminal 3 — Marketplace Frontend**
```bash
cd marketplace && npm install && npm run dev
```
Storefront at http://localhost:3002

---

## Ports

| Service | Port | URL |
|---|---|---|
| Nexus Engine IDE | 5173 | http://localhost:5173 |
| Marketplace API | 3004 | http://localhost:3004 |
| Marketplace Frontend | 3002 | http://localhost:3002 |

---

## Environment Variables

Copy the example file and fill in your own values before starting the API:

```bash
cp marketplace-api/.env.example marketplace-api/.env
```

| Variable | Description |
|---|---|
| `PORT` | API server port (default: 3004) |
| `JWT_SECRET` | Secret for signing JWTs — minimum 32 chars |
| `DATABASE_URL` | Path to the SQLite database file |
| `STRIPE_SECRET_KEY` | Stripe secret key for payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins |
| `APP_URL` | Public marketplace URL used in email confirmation links |
| `HCAPTCHA_SECRET` | Server secret for hCaptcha registration verification |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP settings for confirmation and welcome emails |
| `MAIL_FROM` | Sender displayed in outgoing emails |

Marketplace frontend variables:

```bash
cp marketplace/.env.example marketplace/.env.local
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL consumed with fetch |
| `VITE_HCAPTCHA_SITE_KEY` | Public hCaptcha site key used on registration |
| `VITE_NEXUS_ENGINE_URL` | Nexus Engine iframe URL used by the marketplace |

Nexus Engine variables:

```bash
cp nexus-engine/.env.example nexus-engine/.env.local
```

| Variable | Description |
|---|---|
| `VITE_MARKETPLACE_API_URL` | Marketplace API used by Nexus to validate JWT sessions |
| `VITE_MARKETPLACE_ORIGINS` | Allowed marketplace origins for `postMessage` auth |
| `VITE_MARKETPLACE_URL` | Marketplace login URL used by the locked screen |
| `VITE_NEXUS_BACKEND_WS` | Nexus backend WebSocket URL |
| `MARKETPLACE_API_URL` | Backend-side API URL for WebSocket/API token validation |

---

## Database Model (MCD)

![MCD placeholder](./mockups/mcd-placeholder.png)

> Entities: `User`, `Game`, `Project`, `Purchase`, `McpToken`

---

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/confirm-email` | Confirm registration email |
| POST | `/api/auth/resend-confirmation` | Resend confirmation email |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get authenticated user profile |
| POST | `/api/auth/refresh` | Refresh JWT |

### Games
| Method | Route | Description |
|---|---|---|
| GET | `/api/games` | List all published games |
| GET | `/api/games/:slug` | Get game details by slug |
| POST | `/api/games` | Publish a new game (auth required) |
| PUT | `/api/games/:id` | Update a game (owner only) |
| DELETE | `/api/games/:id` | Delete a game (owner only) |

### Projects
| Method | Route | Description |
|---|---|---|
| GET | `/api/projects` | List user projects |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/:id` | Get project by ID |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Purchases
| Method | Route | Description |
|---|---|---|
| POST | `/api/purchases/checkout` | Create Stripe checkout session |
| GET | `/api/purchases/my` | List user's purchased games |
| POST | `/api/purchases/webhook` | Stripe webhook endpoint |

### Developer
| Method | Route | Description |
|---|---|---|
| GET | `/api/developer/stats` | Developer dashboard stats |
| GET | `/api/developer/games` | Games published by developer |
| POST | `/api/developer/upload` | Upload game bundle |

### MCP
| Method | Route | Description |
|---|---|---|
| POST | `/api/mcp/token` | Generate MCP API token |
| GET | `/api/mcp/games` | MCP: list games (ApiKey auth) |
| POST | `/api/mcp/games` | MCP: create game via agent |

---

## License

MIT © 2026 GameForge Contributors
