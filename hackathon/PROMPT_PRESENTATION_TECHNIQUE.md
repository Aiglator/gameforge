# Prompt — Présentation technique ultra-complète GameForge / SlymFox

> Colle ce prompt à un assistant IA (Claude, GPT, etc.) en lui donnant **accès au repo**, ou seul si tu veux qu’il rédige depuis les informations ci-dessous. Le but est de produire **toute la matière de présentation** demandée par le jury Hackathon : MCD, infra, ORM, JWT, fetch, routes, tests, déploiement, démo, bonus. Une seule passe doit suffire à générer un document pédagogique exploitable tel quel à l’oral.

---

## Rôle de l’IA

Tu es **architecte logiciel senior + rédacteur technique pédagogue**. Tu prépares la **présentation orale et écrite** d’un projet Hackathon Full Stack — public mixte (jury technique + non-tech). Tu expliques chaque concept comme à un étudiant motivé : tu donnes la définition, le pourquoi du choix, l’extrait de code minimal, le piège à éviter.

Ton style :

- Phrases courtes, voix active, vocabulaire précis.
- Pas d’emoji, pas de bullet point vide, pas de blabla marketing.
- Chaque bloc de code est commenté ligne par ligne quand c’est non-évident.
- Tu termines chaque section par **« Ce qu’il faut retenir »** en 2 lignes max.

---

## Projet

**Nom** : GameForge (servi sur **slymfox.com**)
**Pitch** : Plateforme communautaire de création, hébergement et distribution de jeux 2D/3D jouables directement dans le navigateur. Inclut un éditeur intégré (Nexus Engine), une marketplace, une économie Stripe et un serveur MCP pour brancher l’IA de son choix.

**Architecture déployée — VPS Ubuntu unique** :

```
Internet → Cloudflare (proxy + DDoS + CDN)
           └─ HTTPS Let's Encrypt
              └─ Nginx (reverse proxy + static)
                 ├─ slymfox.com / www         → /opt/gameforge/nexus-engine/dist        (statique)
                 ├─ marketplace.slymfox.com   → /opt/gameforge/marketplace/dist          (statique)
                 ├─ api.slymfox.com           → 127.0.0.1:3004  (Express + Sequelize)    PM2
                 └─ ws.slymfox.com            → 127.0.0.1:3001  (Express + ws WebSocket) PM2
```

**Stack** :

| Couche | Tech |
|---|---|
| Frontend Studio | Vue 3 + Vite + TypeScript + Pinia + Three.js r168 + Cannon-es + Monaco |
| Frontend Marketplace | Vue 3 + Vite + Pinia + vue-router + TailwindCSS |
| Backend REST | Node 20 + Express 4 + Sequelize 6 + SQLite 3 |
| Backend Realtime | Node 20 + Express 4 + ws 8 |
| Auth | JWT (jsonwebtoken) + bcrypt (12 rounds) |
| Paiement | Stripe Checkout + webhooks signés |
| Mail | Nodemailer (SMTP / Resend / SES) |
| IA | Serveur MCP (Model Context Protocol) — BYO clé IA |
| Tests | Jest 30 + Supertest 7 |
| Déploiement | VPS Ubuntu + Nginx + PM2 + Certbot + UFW + fail2ban |

**Repo** : https://github.com/Aiglator/eemi-gameforge — branche `nexus-engine`.

---

## Livrables attendus de toi (l’IA)

Produis **un seul document Markdown structuré** comprenant toutes les sections suivantes, dans cet ordre exact. À chaque section, n’invente rien : utilise les extraits de code et tableaux fournis ci-dessous, et étoffe-les avec ta pédagogie.

### 1. Présentation du projet (1 page)

- Le problème résolu (créer un jeu sans installer Unity/Godot/Unreal).
- La proposition de valeur (tout dans le navigateur, monétisation incluse, IA branchable).
- Pour qui (dev indépendants, étudiants, studios qui veulent une page de distribution).
- Les concurrents directs (itch.io, Roblox Studio, Construct) et notre différence (open + MCP + Three.js standard).

### 2. Fonctionnalités livrées (rubrique → ce qui marche)

- **Studio Nexus Engine** : viewport Three.js, hiérarchie de scène, inspector, ProjectWizard 2D/3D, Code Editor Monaco avec autocomplétion API moteur, sauvegarde temps réel via WebSocket.
- **Marketplace** : Home, Catalog filtrable, GamePage, Player iframe sandbox, Profile, Dashboard dev, Admin, Auth, ConfirmEmail.
- **Économie** : achats in-app, jeux payants, webhook Stripe, reversement 70/30.
- **MCP** : serveur exposant `scene_read`, `scene_write`, `script_read`, `script_write`, `asset_list`, `physics_config`, `npc_prompt`.

### 3. Technologies, langages et librairies utilisées

Reprends le tableau Stack ci-dessus et **explique chaque ligne** : « Vue 3 a été choisi parce que … », « Sequelize plutôt que Prisma parce que SQLite + migration alter natif … ».

### 4. Infrastructure choisie (avec le schéma ASCII fourni)

Explique :

- Pourquoi **un seul VPS** (simplicité de déploiement Hackathon, coût, séparation logique via Nginx).
- Pourquoi **Nginx en frontal** (TLS, gzip, cache long, reverse proxy, ferme les ports internes du monde).
- Pourquoi **PM2** (restart auto, démarrage systemd, logs centralisés, déploiement zero-downtime via `pm2 reload`).
- Pourquoi **Cloudflare devant** (CDN gratuit, anti-DDoS, support WebSocket).

### 5. Schéma MCD (Modèle Conceptuel de Données)

Reproduis et commente ce diagramme :

```
USERS (1)──(1) DEVELOPERS (1)──(*) GAMES (1)──(*) GAME_ITEMS
   │                                  │
   │                                  │
   └──(*)─ PURCHASES ─(*)─────────────┘
```

Explique :

- `users` est l’identité de base (nom, prénom, email, password_hash, birthday, role).
- `developers` étend un user qui publie (api_key, plan free/pro, revenue_total, webhook_url, mcp_enabled).
- `games` appartient à un developer (slug unique, category, price, status draft/pending_review/published/suspended).
- `purchases` historise toutes les transactions (user_id, game_id, amount, currency, type, stripe_id).
- `game_items` permet les achats in-app (skins, niveaux, items).

**Justification du choix SQLite** : un seul fichier, ACID, suffisant pour ~10 000 utilisateurs actifs, sauvegarde triviale (cron + cp).

### 6. ORM — utilisation de Sequelize

Définition pour le jury :

> Un ORM (Object-Relational Mapper) est une couche qui traduit les **objets** d’un langage (User, Game, Purchase en JS) en **lignes** de tables relationnelles, et vice-versa. On écrit `await User.findOne({ where: { email } })` au lieu de `SELECT * FROM users WHERE email = ?`. L’ORM gère la connexion, la prévention des injections SQL (paramètres bindés), les migrations, et les relations.

Pourquoi Sequelize ici :

- Mature, supporte SQLite/Postgres/MySQL → migration future sans réécriture.
- `sync({ alter: true })` synchronise le schéma automatiquement en dev.
- Associations expressives (`belongsTo`, `hasMany`).

Extrait commenté à reprendre tel quel :

```js
// marketplace-api/db/models.js
import { DataTypes } from 'sequelize'
import sequelize from './database.js'

export const User = sequelize.define('User', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nom:           { type: DataTypes.STRING,  allowNull: false },
  prenom:        { type: DataTypes.STRING,  allowNull: false },
  email:         { type: DataTypes.STRING,  allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING,  allowNull: false },
  birthday:      { type: DataTypes.STRING },
  role:          { type: DataTypes.STRING,  defaultValue: 'user' },
  is_verified:   { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: false })

export const Game = sequelize.define('Game', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  developer_id: { type: DataTypes.INTEGER },
  name:         { type: DataTypes.STRING, allowNull: false },
  slug:         { type: DataTypes.STRING, allowNull: false, unique: true },
  price:        { type: DataTypes.FLOAT,  defaultValue: 0 },
  status:       { type: DataTypes.STRING, defaultValue: 'draft' },
}, { tableName: 'games', timestamps: true })

// Associations expressives — l'ORM génère les JOIN SQL pour nous
Developer.belongsTo(User,    { foreignKey: 'user_id' })
User.hasOne(Developer,       { foreignKey: 'user_id' })
Game.belongsTo(Developer,    { foreignKey: 'developer_id' })
Developer.hasMany(Game,      { foreignKey: 'developer_id' })

await sequelize.sync({ alter: true })   // ALTER TABLE auto en dev
```

**Ce qu’il faut retenir** : on ne touche jamais à SQL brut, on parle objets ; l’ORM signe les requêtes et protège des injections.

### 7. Authentification JWT — mise en place et explication

Définition pour le jury :

> Un **JWT** (JSON Web Token) est un jeton signé numériquement contenant l’identité de l’utilisateur. Trois parties séparées par des points : `header.payload.signature`. Le serveur le crée à la connexion, le client le stocke (localStorage), et le renvoie dans le header `Authorization: Bearer <token>` à chaque requête. Le serveur vérifie la signature avec son secret — pas besoin de session côté serveur, **stateless**.

Pourquoi JWT plutôt que session-cookie :

- Stateless = scalable, pas de sticky session.
- Multi-domaine : marketplace.slymfox.com et slymfox.com partagent l’auth.
- WebSocket : le backend Nexus relaie le token au marketplace-api pour vérifier.

Bcrypt — pourquoi 12 rounds : compromis vitesse/sécurité 2026, ralentit les brute-force GPU.

Extrait login :

```js
// marketplace-api/routes/auth.js
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User } from '../db/models.js'

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },  // payload public, JAMAIS de secret
    process.env.JWT_SECRET,                                 // 64 chars random, .env
    { expiresIn: '7d' }                                     // expiration côté serveur
  )
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ where: { email } })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' })
  res.status(200).json({ token: signToken(user), user: safeUser(user) })
})
```

Middleware de protection :

```js
// marketplace-api/middleware/auth.js
export async function requireAuth(req, res, next) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' })
  try {
    const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET)
    req.user = await User.findByPk(payload.id)
    if (!req.user) return res.status(401).json({ message: 'User missing' })
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
```

Côté frontend Vue, gestion du token avec Pinia + persistance localStorage (voir section 9).

**Ce qu’il faut retenir** : trois parties signées, secret côté serveur uniquement, jamais en URL.

### 8. Routes API — liste complète + explication d’un endpoint

Toutes les routes sont sous `/api/`. Reproduis le tableau de la section 7.2 du CDC, **groupé par ressource**, puis détaille un endpoint complet (création de jeu) :

```js
// marketplace-api/routes/games.js
import { Router } from 'express'
import { Game, Developer } from '../db/models.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/games — public, liste des jeux publiés avec leur développeur
router.get('/', async (_req, res) => {
  const games = await Game.findAll({
    where: { status: 'published' },
    include: [{ model: Developer, include: [User] }], // JOIN automatique
    order: [['created_at', 'DESC']],
    limit: 50,
  })
  res.json({ games })
})

// POST /api/games — protégé : crée un jeu et le met en pending_review
router.post('/', requireAuth, async (req, res) => {
  const { name, slug, description, category, price } = req.body
  if (!name || !slug) return res.status(400).json({ message: 'name/slug required' })
  const game = await Game.create({
    name, slug, description, category, price,
    developer_id: req.user.id,
    status: 'pending_review',
  })
  res.status(201).json({ game })
})

export default router
```

### 9. Consommation de l’API côté frontend (fetch) + responsive + auth

#### 9.1 Wrapper fetch typé (`src/lib/api.ts`)

```ts
const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('jwt')
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error((await res.json()).message ?? res.statusText)
  return res.json() as Promise<T>
}

export const api = {
  login:     (email: string, password: string) =>
               request<{ token: string; user: User }>('/auth/login',
                 { method: 'POST', body: JSON.stringify({ email, password }) }),
  listGames: () => request<{ games: Game[] }>('/games'),
  getGame:   (slug: string) => request<{ game: Game }>('/games/' + slug),
}
```

#### 9.2 Pinia authStore — gestion du token

```ts
// src/stores/authStore.ts
import { defineStore } from 'pinia'
import { api } from '@/lib/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: localStorage.getItem('jwt') as string | null,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    isDev:      (s) => s.user?.role === 'developer' || s.user?.role === 'admin',
  },
  actions: {
    async login(email: string, password: string) {
      const { token, user } = await api.login(email, password)
      localStorage.setItem('jwt', token)
      this.token = token
      this.user  = user
    },
    logout() {
      localStorage.removeItem('jwt')
      this.token = null
      this.user  = null
    },
  },
})
```

Navigation guard :

```ts
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'auth' }
  if (to.meta.requiresDev  && !auth.isDev)      return { name: 'home' }
})
```

#### 9.3 Responsive — Tailwind, mobile-first

```vue
<!-- src/components/GameGrid.vue -->
<template>
  <section class="grid gap-4
                  grid-cols-1
                  sm:grid-cols-2
                  md:grid-cols-3
                  lg:grid-cols-4
                  xl:grid-cols-5
                  px-4 sm:px-6 lg:px-8">
    <GameCard v-for="g in games" :key="g.id" :game="g" />
  </section>
</template>
```

Tailwind compile les classes en CSS minimal et applique les breakpoints `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). **Pas une seule media query écrite à la main.**

### 10. Tests unitaires et fonctionnels

Pour le jury, distingue :

- **Unitaire** : teste une fonction isolée (bcrypt, signature JWT). Pas de réseau, pas de DB.
- **Fonctionnel** (ou intégration / e2e API) : teste un endpoint réel via HTTP (Supertest), de la requête à la réponse, en passant par l’ORM et SQLite.

#### Unitaire — extrait

```js
// marketplace-api/tests/unit/auth.test.js
describe('JWT token generation', () => {
  it('should reject an expired token', async () => {
    const t = jwt.sign({ id: 1 }, 'test_secret', { expiresIn: '0s' })
    await new Promise(r => setTimeout(r, 100))
    expect(() => jwt.verify(t, 'test_secret')).toThrow('jwt expired')
  })
})
```

#### Fonctionnel — extrait

```js
// marketplace-api/tests/functional/api.test.js
describe('POST /api/auth/register', () => {
  it('should register a new user and return JWT', async () => {
    const res = await request('http://localhost:3004')
      .post('/api/auth/register')
      .send(testUser)
      .expect('Content-Type', /json/)
      .expect(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).not.toHaveProperty('password_hash')
  })
})
```

Lancer : `npm test`, `npm run test:unit`, `npm run test:functional`.

### 11. Déploiement — solutions choisies

**Stratégie** : un seul script (`deploy.sh`) à la racine du repo, qui installe la totalité sur un VPS Ubuntu vierge en une commande.

Étapes du script (à expliquer pas à pas au jury) :

1. **APT update + paquets** : Nginx, certbot, Node 20, PM2, sqlite3, ufw, fail2ban.
2. **Utilisateur applicatif `gameforge`** isolé du root.
3. **Clone du repo** dans `/opt/gameforge`.
4. **Génération des `.env`** : JWT_SECRET auto, URLs publiques, CORS, Stripe.
5. **`npm ci` + builds Vite** pour les deux fronts.
6. **PM2** : `ecosystem.config.cjs` lance `marketplace-api` (3004) et `nexus-engine-backend` (3001), avec restart auto et démarrage systemd.
7. **Nginx** : 4 vhosts (slymfox.com, marketplace, api, ws) avec gzip, cache long et proxy upgrade WebSocket pour `ws.slymfox.com`.
8. **Certbot** : un seul appel `certbot --nginx` couvre les 5 sous-domaines.
9. **UFW** ouvre 22/80/443 uniquement.
10. **Cron daily** : sauvegarde SQLite, rétention 14j.

Pour redéployer après un push :

```bash
sudo -u gameforge git -C /opt/gameforge pull
sudo -u gameforge bash -c 'cd /opt/gameforge/marketplace-api && npm ci --omit=dev'
sudo -u gameforge bash -c 'cd /opt/gameforge/nexus-engine && npm ci && npm run build'
sudo -u gameforge bash -c 'cd /opt/gameforge/marketplace && npm ci && npm run build'
sudo -u gameforge pm2 reload all
```

### 12. Bonus — démontrer chacun

Pour chaque case « bonus » de la grille Hackathon, donne **un extrait de code ou une commande prouvant que c’est en place** :

| Bonus | Preuve |
|---|---|
| IA / ML | `mcp/server.js` — endpoints `tools/list`, `tools/call` exposant scene_read, script_write, etc. |
| Cyber-sécurité | bcrypt 12 rounds, CSP frame-ancestors, UFW, fail2ban, sandbox iframe |
| Résilience | PM2 max_memory_restart 400M, cron backup SQLite, Cloudflare DDoS, health-check |
| SEO | Open Graph + Twitter Card, sitemap, slug URLs |
| RGPD | birthday + gating <18, DELETE /api/auth/me (droit à l’oubli), bandeau cookies |
| PWA | manifest.webmanifest + service-worker prévu (vite-plugin-pwa) |
| Paiement | Stripe Checkout + webhook signé |
| Mail | `marketplace-api/utils/mailer.js` Nodemailer + SMTP/Resend/SES |

### 13. Démonstration live — script de 5 minutes

Donne un déroulé minuté :

- 0:00 — Slide titre, problème.
- 0:30 — Marketplace : home + catalogue + filtre.
- 1:00 — Auth : inscription → token JWT visible dans devtools localStorage.
- 1:30 — Studio : création projet 3D, ajout d’une sphère, gravité, script onUpdate.
- 3:00 — Publication → apparition dans la marketplace.
- 3:30 — Achat Stripe en mode test → webhook → bibliothèque mise à jour.
- 4:00 — MCP : connecter Claude Desktop, demander à l’IA de modifier la scène en live.
- 4:30 — `pm2 status` + `curl https://api.slymfox.com/api/health` → 200 OK.
- 5:00 — Slide remerciements.

---

## Contraintes de rendu

- Markdown propre, prêt à coller dans Notion, Gamma ou Google Docs.
- Chaque bloc de code = du **vrai code** du repo, pas du pseudo-code.
- Pas de phrase « ce projet est innovant et révolutionnaire » : montre, ne dis pas.
- Longueur cible : 15 à 25 pages A4 imprimées.
- Réponds en **français**, registre soutenu mais accessible.

Quand tu as terminé, produis en fin de réponse une **table des matières cliquable** et une **liste de questions probables du jury avec leur réponse en 2 lignes**.
