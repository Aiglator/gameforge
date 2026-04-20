# Marketplace API

REST API for the GameForge platform. Handles authentication, game listings, file uploads, purchases (Stripe), and MCP agent access.

**Stack:** Express 4 · Sequelize 6 · SQLite3 · JWT · bcrypt · Multer · Stripe

---

## Setup

```bash
cd marketplace-api
npm install
cp .env.example .env   # fill in your secrets
node index.js
```

Server starts on **http://localhost:3004**

---

## Authentication

Most routes require a Bearer JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

MCP routes use an API key header instead:

```
ApiKey: <mcp_api_key>
```

---

## Endpoints

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register a new user |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Get current user profile |

### Games

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/games` | None | List all published games |
| GET | `/api/games/:slug` | None | Get game by slug |
| POST | `/api/games` | Bearer | Publish new game |
| PUT | `/api/games/:id` | Bearer (owner) | Update game |
| DELETE | `/api/games/:id` | Bearer (owner) | Delete game |

### Projects

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/projects` | Bearer | List current user's projects |
| POST | `/api/projects` | Bearer | Create a project |
| GET | `/api/projects/:id` | Bearer | Get project by ID |
| PUT | `/api/projects/:id` | Bearer (owner) | Update project |
| DELETE | `/api/projects/:id` | Bearer (owner) | Delete project |

### Purchases

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/purchases/checkout` | Bearer | Create Stripe checkout session |
| GET | `/api/purchases/my` | Bearer | List purchased games |
| POST | `/api/purchases/webhook` | Stripe sig | Stripe webhook handler |

### Developer

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/developer/stats` | Bearer | Revenue and download stats |
| GET | `/api/developer/games` | Bearer | Games published by developer |
| POST | `/api/developer/upload` | Bearer | Upload game bundle (multipart) |

### MCP

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/mcp/token` | Bearer | Generate an MCP API token |
| GET | `/api/mcp/games` | ApiKey | List games via agent |
| POST | `/api/mcp/games` | ApiKey | Create game via AI agent |

---

## Example curl Commands

**Register**
```bash
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'
```

**Login**
```bash
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'
# returns: { "token": "<jwt>", "user": { ... } }
```

**Get all games**
```bash
curl http://localhost:3004/api/games
```

**Get authenticated user**
```bash
curl http://localhost:3004/api/auth/me \
  -H "Authorization: Bearer <token>"
```
