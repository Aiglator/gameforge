# Dossier Hackathon - GameForge

## 1. Cahier des charges

GameForge est une application web full stack pour creer, publier et jouer a des jeux navigateur. Le projet repond au besoin d'une plateforme unique combinant marketplace, moteur de creation 2D/3D et publication.

Fonctionnalites principales:
- Marketplace de jeux avec catalogue, fiches detaillees et lecteur integre.
- Authentification JWT avec inscription, connexion, profil, roles user/developer/admin.
- Confirmation email a l'inscription et email de bienvenue apres validation.
- Protection hCaptcha sur l'inscription.
- Dashboard developpeur avec generation de cle API et creation de jeux.
- Nexus Engine: editeur Vue/Three.js avec scene, inspecteur, blocks visuels, physique et gravite editable.
- API REST Node/Express documentee.
- ORM Sequelize sur SQLite.

Choix techniques:
- Frontend marketplace: Vue 3, Pinia, Vue Router, TailwindCSS, fetch.
- Backend: Node.js, Express, Sequelize, SQLite, JWT, bcrypt, nodemailer.
- Engine: Vue 3, TypeScript, Three.js, Cannon-es, Monaco.
- Tests: Jest, Supertest.
- Variables sensibles: `.env` et `.env.example`.

Infrastructure locale:
- Marketplace frontend: `http://localhost:3002`
- API REST: `http://localhost:3004`
- Nexus Engine: `http://localhost:5173` ou iframe marketplace `/engine`

## 2. MCD

Entites principales:

```text
User (1) -- (0..1) Developer
Developer (1) -- (0..n) Game
User (1) -- (0..n) Purchase
Game (1) -- (0..n) Purchase
Game (1) -- (0..n) GameItem
```

Tables:
- `users`: identite, email, hash password, role, verification, ban, token confirmation.
- `developers`: lien user, api_key, plan, revenus, MCP.
- `games`: jeux publies/drafts, slug, categorie, prix, chemin projet.
- `purchases`: achats utilisateur.
- `game_items`: items monetisables par jeu.

## 3. Routes API

Auth:
- `POST /api/auth/register`
- `POST /api/auth/confirm-email`
- `POST /api/auth/resend-confirmation`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

Games:
- `GET /api/games`
- `GET /api/games/:slug`
- `POST /api/games`
- `PATCH /api/games/:id`
- `PUT /api/games/:id/publish`
- `DELETE /api/games/:id`
- `POST /api/games/:slug/play`

Developer:
- `GET /api/developer/keys`
- `POST /api/developer/keys/regenerate`
- `GET /api/developer/analytics`
- `POST /api/developer/become`

Projects:
- `GET /api/projects/:gameId/save`
- `POST /api/projects/:gameId/save`
- `GET /api/projects/:gameId/assets`
- `POST /api/projects/:gameId/assets`

## 4. Appels API cote frontend

Les appels passent par `marketplace/src/lib/api.ts`.

Exemple:
```ts
const res = await api.post('/auth/login', { email, password })
localStorage.setItem('token', res.token)
```

Le token JWT est envoye via:
```ts
Authorization: Bearer <token>
```

## 5. Authentification et securite

Mesures implementees:
- Hash password avec bcrypt.
- JWT signe avec `JWT_SECRET`.
- Verification hCaptcha a l'inscription si `HCAPTCHA_SECRET` est configure.
- Email de confirmation avec token aleatoire hashe en base.
- Refus de connexion tant que `is_verified` est faux.
- Email de bienvenue apres confirmation.
- Rate limiting sur les routes auth.
- Validation email/password/birthday.
- Headers securite: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- CORS configure par `CORS_ORIGINS`.
- Acces Nexus Engine protege par route guard JWT cote frontend.

## 6. Tests

Commandes:
```bash
cd marketplace-api
npm run test:unit
npm run test:functional
```

Tests couverts:
- Hash bcrypt.
- Verification password.
- JWT valide/invalide/expire.
- Validation password.
- Parcours fonctionnel register -> confirm email -> login.

## 7. Deploiement

Plan recommande:
- Frontend marketplace: Vercel ou Netlify.
- API Node: Render, Railway, Fly.io ou VPS.
- Base de donnees: SQLite pour demo, PostgreSQL recommande en production.
- Variables env configurees sur la plateforme d'hebergement.
- Domaine API renseigne dans `VITE_API_URL`.

Variables importantes:
- API: `PORT`, `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, `APP_URL`, `HCAPTCHA_SECRET`, SMTP.
- Frontend: `VITE_API_URL`, `VITE_HCAPTCHA_SITE_KEY`.

## 8. Bonus presentes

| Bonus | Etat | Evidence |
|---|---|---|
| IA / agent | Oui | Routes MCP et backend Nexus Engine |
| Cybersecurite | Oui | JWT, hCaptcha, bcrypt, rate limit, headers, validation |
| Mail | Oui | Confirmation email + welcome email |
| Paiement | Partiel | Schema achats et variables Stripe presentes |
| RGPD | Partiel | Verification email et separation donnees sensibles |
| PWA / offline | Non | A ajouter si necessaire |
| SEO / analytics | Non | A ajouter si necessaire |

## 9. Checklist evaluation

| Critere | Acquis | Commentaire |
|---|---|---|
| Cahier des charges | Oui | Present dans ce dossier |
| Maquette Figma | A fournir | Les mockups HTML existent, lien Figma a ajouter |
| Front Vue.js | Oui | `marketplace` et `nexus-engine` |
| Backend Node.js | Oui | `marketplace-api` |
| API REST | Oui | Routes Express |
| ORM | Oui | Sequelize |
| JWT | Oui | `routes/auth.js`, `middleware/auth.js` |
| Variables env | Oui | `.env.example` API et frontend |
| Tests unitaires | Oui | Jest |
| Tests fonctionnels | Oui | Supertest, necessite API lancee |
| Documentation | Oui | README + ce dossier |
| Deploiement en ligne | A faire | URLs de production a renseigner |
