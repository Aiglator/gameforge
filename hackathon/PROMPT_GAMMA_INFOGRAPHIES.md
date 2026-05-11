# Prompt pour Gamma — Deck + infographies GameForge / SlymFox

> Colle ce prompt dans **Gamma** (option « Generate » → « Create Presentation » ou « Create Document with images »). Le but : que Gamma crée **un deck visuel et didactique** de 18 slides avec une infographie générée par slide, dans un style cohérent et professionnel. Utilisable pour la soutenance Hackathon Full Stack.
>
> Mode recommandé sur Gamma : **Presentation** → **Generate from text** → coller intégralement le bloc ci-dessous → choisir un thème **Sombre / Néon / Tech**.

---

## Brief pour Gamma

**Titre du deck** : GameForge / SlymFox — Plateforme communautaire de création de jeux

**Audience** : Jury Hackathon EEMI Full Stack (technique + non-technique). Présentation orale de 10 minutes + démo.

**Style visuel** : sombre, néon bleu/orange, futuriste, ambiance « game tech », typographie sans-serif moderne. Couleurs dominantes : `#1E40AF` (bleu profond), `#3B82F6` (bleu vif), `#F97316` (orange accent), `#0F172A` (fond), `#E2E8F0` (texte clair). Coins arrondis, ombres douces, dégradés subtils.

**Pour CHAQUE slide** :

1. Génère une **infographie ou illustration vectorielle** centrée sur le sujet (pas une simple photo stock — un schéma, un diagramme, une icône composée).
2. Le texte est court : un titre fort + 3 à 5 puces explicatives.
3. Toujours ajouter une **mini-légende technique** en bas de slide (ex. version exacte d’une lib, lien de référence).
4. Privilégier les **diagrammes** (architecture, MCD, flux JWT, séquence Stripe) sur les longs paragraphes.

---

## Plan exact des 18 slides à générer

### Slide 1 — Couverture

- Titre : **GameForge** — Construis, publie, joue, gagne.
- Sous-titre : Plateforme communautaire de création de jeux vidéo dans le navigateur — Hackathon EEMI Full Stack 2026.
- Infographie : Logo stylisé (forge + console de jeu + browser) avec dégradé bleu vers orange.
- Légende : `slymfox.com — marketplace.slymfox.com`

### Slide 2 — Le problème

- Titre : Créer un jeu en 2026, c’est encore trop dur.
- Puces : installation IDE lourd, publication sur stores difficile, hébergement à monter, pas d’IA intégrée.
- Infographie : 4 obstacles dessinés en chaîne (icônes : ⬇ install, 📦 publish, 🖥 host, 🤖 AI) coupant le chemin du créateur vers le joueur.

### Slide 3 — Notre solution

- Titre : GameForge — tout-en-un, tout dans le navigateur.
- Puces : Studio embarqué (Three.js + Cannon-es), marketplace intégrée, économie Stripe, MCP pour brancher l’IA.
- Infographie : Funnel « Idée → Studio → Publish → Joueur → Revenu » avec icônes à chaque étape.

### Slide 4 — Démo en chiffres (objectifs cibles)

- 50+ jeux publiés à 6 mois.
- 5 000 DAU à 12 mois.
- Chargement < 3 s.
- 70 % de revenus reversés au développeur.
- Infographie : tableau de bord stylisé avec 4 KPI géants.

### Slide 5 — Architecture (schéma central)

- Titre : Un seul VPS, quatre sous-domaines.
- Infographie : Diagramme **obligatoire** à reproduire :
  - Cloud Internet → Cloudflare → Nginx → 4 boîtes :
    - `slymfox.com` (Studio Nexus Engine — statique Vue 3)
    - `marketplace.slymfox.com` (Marketplace — statique Vue 3)
    - `api.slymfox.com` (Express + Sequelize, port 3004, PM2)
    - `ws.slymfox.com` (Express + WebSocket, port 3001, PM2)
  - Sous-couche : SQLite + uploads disque + sauvegarde cron quotidienne.
- Style : boîtes arrondies, flèches HTTPS, code couleur fronts vs backs.

### Slide 6 — Stack technique

- Titre : Notre stack — Vue 3 + Node 20 + Sequelize + Three.js.
- Infographie : Pile en couches verticales (frontend → API → ORM → DB), chaque couche avec son logo.
- Mini-tableau : Frontend / Realtime / Backend / Auth / Paiement / IA / Tests / Déploiement.

### Slide 7 — MCD (modèle conceptuel de données)

- Titre : 5 entités relationnelles + 1 fichier JSON projet.
- Infographie : Diagramme MCD net avec cardinalités :
  - USERS (1)─(1) DEVELOPERS (1)─(*) GAMES (1)─(*) GAME_ITEMS
  - USERS (1)─(*) PURCHASES (*)─(1) GAMES
- Légende : SQLite, géré par Sequelize 6.

### Slide 8 — Routes API (vue d’ensemble)

- Titre : 27 endpoints REST sous `/api/`.
- Infographie : 7 groupes en pastilles (auth, games, projects, purchases, developer, mcp, admin) avec compteurs (4, 5, 5, 3, 3, 3, 4).
- Mini extrait : `GET /api/games`, `POST /api/auth/login`, `POST /api/purchases/checkout`.

### Slide 9 — Authentification JWT

- Titre : JWT stateless, bcrypt(12), Bearer token.
- Infographie : Flux séquence en 6 étapes (Client login → API vérifie bcrypt → Signe JWT → Renvoie token → Client stocke localStorage → Future requête : `Authorization: Bearer …` → Middleware vérifie signature → Réponse autorisée).
- Légende : `jsonwebtoken 9.0`, `bcrypt 5.1`, expiration 7j, secret 64 chars.

### Slide 10 — ORM Sequelize

- Titre : Plus de SQL brut, des objets JavaScript.
- Infographie : À gauche le SQL `SELECT * FROM games WHERE status='published' …`, à droite l’équivalent `Game.findAll({ where: { status: 'published' }, include: [Developer] })`. Flèche entre les deux.
- Puces : injections SQL impossibles, migration alter native, multi-SGBD (SQLite → Postgres).

### Slide 11 — Frontend Vue 3

- Titre : Composition API + Pinia + TailwindCSS.
- Infographie : Capture d’écran stylisée d’un GameCard et d’une GameGrid responsive (mobile / tablet / desktop côte à côte).
- Mini code : extrait `class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"`.

### Slide 12 — Nexus Engine Studio

- Titre : Un IDE complet dans le navigateur.
- Infographie : Capture d’écran représentative — viewport Three.js central, hiérarchie de scène à gauche, inspector à droite, console Monaco en bas.
- Puces : Three.js r168, Cannon-es 0.20, Monaco 0.52, autosave WebSocket.

### Slide 13 — Tests Jest + Supertest

- Titre : Unitaires + fonctionnels.
- Infographie : Schéma en deux colonnes — Unit (bcrypt, JWT, validation) vs Functional (Supertest sur l’API live). Pyramide de tests classique.
- Mini code : `expect(() => jwt.verify(t, secret)).toThrow('jwt expired')`.

### Slide 14 — Paiement Stripe

- Titre : Stripe Checkout + webhook signé.
- Infographie : Flux séquence achat (Player → Checkout Stripe → Webhook signé → ORM enregistre Purchase → bibliothèque mise à jour).
- Légende : reversement 70/30 dev/plateforme.

### Slide 15 — MCP — bonus IA

- Titre : Branche n’importe quelle IA via le Model Context Protocol.
- Infographie : Diagramme — Claude Desktop / Cursor / Continue ▶ MCP Server ▶ Tools (scene_read, scene_write, script_write, asset_list, physics_config, npc_prompt) ▶ Nexus Engine.
- Puces : Bring-Your-Own-Key (la plateforme ne stocke aucun token IA), transport SSE, auth par clé API développeur.

### Slide 16 — Déploiement `deploy.sh`

- Titre : Un script, un VPS, dix minutes.
- Infographie : 10 étapes numérotées en cascade (apt → node → user → clone → .env → build → pm2 → nginx → certbot → ufw + backup).
- Mini code : `sudo ADMIN_EMAIL=admin@slymfox.com bash deploy.sh`.

### Slide 17 — Bonus cochés

- Titre : 8 bonus livrés sur 8 possibles.
- Infographie : Grille 4x2 avec icônes — IA (MCP), Sécurité (bcrypt + UFW + CSP), Résilience (PM2 + cron backup + Cloudflare), SEO (OG + sitemap + slugs), RGPD (gating + droit oubli), PWA (manifest + SW), Paiement (Stripe), Mail (Nodemailer).
- Chaque pastille en vert si « validé ».

### Slide 18 — Démo & merci

- Titre : Live sur slymfox.com.
- Puces : URL live + QR code généré vers `https://slymfox.com`.
- Infographie : QR code stylisé + logo + équipe.

---

## Consignes finales pour Gamma

- Ne pas remplir le deck de placeholders « lorem ipsum » : utiliser exactement les textes ci-dessus.
- Limiter chaque slide à **40 mots de texte** maximum (hors code).
- Préférer **un visuel custom par slide** plutôt qu’une photo stock. Quand l’infographie demande un diagramme spécifique (slide 5, 7, 9, 14, 15), respecte l’ordre et les noms des composants.
- Activer la **table des matières automatique**.
- Format final : 16:9, contraste WCAG AA, lisible projeté à 5 mètres.
- Langue : **français**.

À la fin, propose :

1. Un **export PDF** prêt à imprimer.
2. Une **version mobile** pour le partage WhatsApp/LinkedIn (1080×1080 par slide).
3. Trois **suggestions de variations de thème** (sombre néon, clair minimaliste, gaming arcade).
