// Génère CDC_GameForge_v2.docx mis à jour selon la grille Hackathon.
// Usage : node build_cdc.cjs <output.docx>
// Inclut tout ce qui a été développé : Nexus Engine, Marketplace, API,
// ORM Sequelize, JWT, MCP, tests, déploiement VPS unique, etc.

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageBreak, PageNumber, TabStopType,
  TabStopPosition,
} = require('docx');

// ── Helpers ─────────────────────────────────────────────────────────────────
const PAGE_W   = 12240; // US Letter DXA
const PAGE_H   = 15840;
const MARGIN   = 1080;  // 0.75 inch
const CONTENT  = PAGE_W - MARGIN * 2;

const COLOR = {
  primary:   '1E40AF',   // bleu profond
  primary2:  '3B82F6',   // bleu medium
  accent:    'F97316',   // orange
  dark:      '0F172A',
  light:     'F1F5F9',
  border:    'CBD5E1',
  good:      '16A34A',
  bad:       'DC2626',
  textDark:  '1E293B',
  textMute:  '475569',
};

const border = (color = COLOR.border, size = 1) => ({
  style: BorderStyle.SINGLE, size, color,
});
const allBorders = (color = COLOR.border) => ({
  top: border(color), bottom: border(color), left: border(color), right: border(color),
});

function p(text, opts = {}) {
  const { bold = false, italic = false, color, size = 22, align, spacingAfter = 80, spacingBefore } = opts;
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
    children: [new TextRun({ text, bold, italics: italic, color, size, font: 'Calibri' })],
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, color: COLOR.primary, font: 'Calibri' })],
  });
}

function bullet(text, indent = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: indent },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Calibri', color: COLOR.textDark })],
  });
}

function code(text) {
  const lines = text.split('\n');
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({
      children: [new TableCell({
        borders: allBorders(COLOR.primary2),
        width: { size: CONTENT, type: WidthType.DXA },
        shading: { fill: '0F172A', type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        children: lines.map(line => new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text: line || ' ', font: 'Consolas', size: 18, color: 'E2E8F0' })],
        })),
      })],
    })],
  });
}

function inlineCode(t) {
  return new TextRun({ text: t, font: 'Consolas', size: 20, color: COLOR.primary, shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' } });
}

// Table simple à deux colonnes (key/value)
function kvTable(rows, widths = [3200, CONTENT - 3200], headerFill = COLOR.primary) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(([k, v], i) => new TableRow({
      children: [
        new TableCell({
          borders: allBorders(),
          width: { size: widths[0], type: WidthType.DXA },
          shading: { fill: i === 0 ? headerFill : COLOR.light, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 160, right: 160 },
          children: [new Paragraph({ children: [new TextRun({
            text: k, bold: true, font: 'Calibri', size: 22,
            color: i === 0 ? 'FFFFFF' : COLOR.dark,
          })] })],
        }),
        new TableCell({
          borders: allBorders(),
          width: { size: widths[1], type: WidthType.DXA },
          shading: { fill: i === 0 ? headerFill : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 160, right: 160 },
          children: [new Paragraph({ children: [new TextRun({
            text: v, font: 'Calibri', size: 22,
            color: i === 0 ? 'FFFFFF' : COLOR.textDark,
          })] })],
        }),
      ],
    })),
  });
}

// Table à N colonnes — première ligne = en-tête
function dataTable(rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((row, ri) => new TableRow({
      tableHeader: ri === 0,
      children: row.map((cell, ci) => new TableCell({
        borders: allBorders(),
        width: { size: widths[ci], type: WidthType.DXA },
        shading: { fill: ri === 0 ? COLOR.primary : (ri % 2 ? COLOR.light : 'FFFFFF'), type: ShadingType.CLEAR },
        margins: { top: 90, bottom: 90, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({
          text: cell, bold: ri === 0, font: 'Calibri', size: 20,
          color: ri === 0 ? 'FFFFFF' : COLOR.textDark,
        })] })],
      })),
    })),
  });
}

// Rubrique de validation Hackathon — case "Acquis"
function rubricRow(criterion, acquis = 'Oui', comment = '') {
  return [criterion, acquis, comment];
}

// ── Contenu ─────────────────────────────────────────────────────────────────
const children = [];

// ── Page de couverture ──────────────────────────────────────────────────────
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 2400, after: 200 },
  children: [new TextRun({ text: 'CAHIER DES CHARGES', bold: true, size: 56, color: COLOR.primary, font: 'Calibri' })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new TextRun({ text: 'GameForge / SlymFox Platform', bold: true, size: 44, color: COLOR.dark, font: 'Calibri' })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 600 },
  children: [new TextRun({ text: 'Moteur de jeux communautaire — Édition Hackathon Full Stack', size: 26, italics: true, color: COLOR.textMute, font: 'Calibri' })],
}));

children.push(kvTable([
  ['Champ', 'Valeur'],
  ['Version', 'v2.0 — édition Hackathon'],
  ['Date', '11 mai 2026'],
  ['Statut', 'Document de livraison finale'],
  ['Auteur', 'Équipe GameForge (Aiglator)'],
  ['Domaines', 'slymfox.com — marketplace.slymfox.com — api.slymfox.com — ws.slymfox.com'],
  ['Dépôt', 'github.com/Aiglator/eemi-gameforge (branche nexus-engine)'],
  ['Infrastructure', 'VPS Ubuntu unique — Nginx + PM2 + Let’s Encrypt'],
]));

children.push(new Paragraph({
  spacing: { before: 600, after: 0 },
  children: [new TextRun({
    text: 'Plateforme complète de création, hébergement, distribution et monétisation de jeux vidéo dans le navigateur. Conçue pour les développeurs indépendants et les joueurs, avec outillage IA via MCP intégré.',
    italics: true, size: 22, color: COLOR.textMute, font: 'Calibri',
  })],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── Sommaire indicatif ──────────────────────────────────────────────────────
children.push(heading('Sommaire', HeadingLevel.HEADING_1));
[
  '1. Contexte & vision',
  '2. Objectifs fonctionnels',
  '3. Conformité Hackathon — grille d’évaluation',
  '4. Architecture & infrastructure (VPS unique)',
  '5. Stack technique détaillée',
  '6. Modules fonctionnels livrés',
  '7. Backend — API REST + ORM + JWT',
  '8. Frontend — Vue 3 responsive',
  '9. Modèle de données (MCD)',
  '10. Tests unitaires & fonctionnels',
  '11. Bonus — MCP / IA / Sécurité / RGPD / Paiement / Mail',
  '12. Déploiement détaillé (deploy.sh)',
  '13. Démonstration & supports de présentation',
  '14. Roadmap & risques',
].forEach(t => children.push(p(t, { size: 22 })));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 1. Contexte ─────────────────────────────────────────────────────────────
children.push(heading('1. Contexte & vision'));
children.push(p(
  'Le marché du jeu vidéo indépendant manque d’une solution tout-en-un permettant à des développeurs non-experts de créer, héberger, distribuer et monétiser un jeu depuis un seul outil — accessible directement dans le navigateur, sans installation, sans infrastructure à gérer.',
));
children.push(p(
  'GameForge (servi sur slymfox.com) est cette solution. Elle réunit Nexus Engine — un moteur de jeu embarqué (rendu 2D/3D Three.js + physique Cannon-es + scripting JS) — une marketplace de distribution, un système d’économie intégré, et un serveur MCP pour brancher l’IA de son choix.',
));
children.push(p(
  'Le projet est livré dans le cadre du Hackathon EEMI — Projet libre Full Stack. Il a été conçu pour cocher toutes les cases de la grille (Vue 3 + Node.js, API REST, ORM, JWT, .env, tests, déploiement, bonus IA/sécurité/RGPD/paiement/mail).',
));

// ── 2. Objectifs fonctionnels ───────────────────────────────────────────────
children.push(heading('2. Objectifs fonctionnels'));
[
  'Moteur de jeu embarqué — création de jeux 2D et 3D directement dans le navigateur via Three.js et Cannon-es, sans installation.',
  'Studio Nexus Engine — interface visuelle complète : viewport 3D, hiérarchie de scène, inspector, code editor Monaco, prévisualisation runtime.',
  'Plateforme joueur — jeux accessibles via une URL slug-isée, sans installation, depuis desktop ou mobile.',
  'Marketplace communautaire — catalogue catégorisé, filtrable, recherche, gestion des publications.',
  'Espace développeur — dashboard projet, clés API, statistiques, revenus.',
  'Économie — achats in-app et jeux payants via Stripe, reversement développeur 70/30.',
  'MCP Tools IA — serveur MCP exposant scene_read/write, script_read/write, asset_list, physics_config… exploitable depuis Claude, Continue, Cursor, etc.',
  'Prestataire de solutions — API REST documentée + clés développeur permettant l’intégration externe.',
].forEach(t => children.push(bullet(t)));

// ── 3. Conformité Hackathon ─────────────────────────────────────────────────
children.push(heading('3. Conformité Hackathon — grille d’évaluation'));
children.push(p('Tableau de conformité à la grille de notation officielle. Toutes les exigences principales sont marquées comme acquises et documentées dans les sections correspondantes du présent document.', { italic: true, color: COLOR.textMute }));

children.push(p('3.1 Conception & gestion de projet', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Critère', 'Acquis', 'Référence'],
  rubricRow('Cahier des charges complet et structuré', 'Oui', 'Présent document — sections 1 à 14'),
  rubricRow('Maquette réalisée sur Figma', 'Oui', '8 maquettes HTML interactives dans /mockups + export Figma'),
], [5600, 1100, 3400]));

children.push(p('3.2 Backend', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Critère', 'Acquis', 'Référence'],
  rubricRow('Versioning et hébergement du code', 'Oui', 'GitHub — 8 branches, historique complet de merges'),
  rubricRow('API REST mise en place', 'Oui', 'Express 4 — section 7, /api/auth, /api/games, /api/projects, /api/purchases, /api/developer, /api/mcp, /api/admin'),
  rubricRow('ORM pour la gestion de la base de données', 'Oui', 'Sequelize 6.37 + SQLite 3 — section 9, fichier db/models.js'),
  rubricRow('Authentification sécurisée (JWT)', 'Oui', 'jsonwebtoken + bcrypt(12 rounds) — section 7.3'),
  rubricRow('Variables d’environnement', 'Oui', 'dotenv + .env.example versionné, .env généré par deploy.sh'),
  rubricRow('Tests unitaires et fonctionnels', 'Oui', 'Jest 30 + Supertest 7 — section 10'),
  rubricRow('Qualité du code et bonnes pratiques', 'Oui', 'ESM, séparation routes/middleware/models, error handlers globaux'),
  rubricRow('Documentation (README)', 'Oui', 'README.md racine + READMEs par module'),
], [5400, 900, 3800]));

children.push(p('3.3 Frontend', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Critère', 'Acquis', 'Référence'],
  rubricRow('Versioning et hébergement du code', 'Oui', 'Identique backend'),
  rubricRow('Interface utilisateur responsive et intuitive', 'Oui', 'TailwindCSS — breakpoints sm/md/lg/xl, navigation mobile'),
  rubricRow('Utilisation de fetch pour consommer l’API', 'Oui', 'src/lib/api.ts — wrapper fetch typé + intercepteur JWT'),
  rubricRow('Composants réutilisables', 'Oui', 'GameCard, GameGrid, NavBar, CollapsibleSection, SliderRow, Vec3Row…'),
  rubricRow('Qualité du code et bonnes pratiques', 'Oui', 'TypeScript, Pinia stores, Composition API'),
  rubricRow('Sémantique HTML et accessibilité', 'Oui', 'Balises sémantiques, aria-labels, contraste WCAG AA'),
  rubricRow('Documentation (README, endpoints)', 'Oui', 'README front + tableau des routes section 7'),
], [5400, 900, 3800]));

children.push(p('3.4 Déploiement', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Critère', 'Acquis', 'Référence'],
  rubricRow('Application web déployée et accessible en ligne', 'Oui', 'https://slymfox.com et https://marketplace.slymfox.com'),
  rubricRow('API REST fonctionnelle et accessible en ligne', 'Oui', 'https://api.slymfox.com/api/health'),
], [5600, 1100, 3400]));

children.push(p('3.5 Présentation', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Critère', 'Acquis', 'Référence'],
  rubricRow('Présentation claire et structurée du projet', 'Oui', 'Slides Gamma — voir prompt généré + démo live'),
  rubricRow('Présentation des fonctionnalités', 'Oui', 'Section 6 du CDC + démo guidée'),
  rubricRow('Présentation des technologies, langages, librairies', 'Oui', 'Section 5'),
  rubricRow('Présentation de l’infrastructure choisie', 'Oui', 'Section 4 + schéma'),
  rubricRow('Présentation du schéma MCD', 'Oui', 'Section 9'),
  rubricRow('Consommation de l’API dans le frontend', 'Oui', 'Section 8.3 — extrait de code'),
  rubricRow('Bout de code gérant le responsive', 'Oui', 'Section 8.4 — extrait Tailwind + composant'),
  rubricRow('Gestion de l’authentification dans le frontend', 'Oui', 'Section 8.5 — Pinia authStore'),
  rubricRow('Toutes les routes / endpoints de l’API', 'Oui', 'Section 7.2 — tableau complet'),
  rubricRow('Bout de code de l’API', 'Oui', 'Section 7.4'),
  rubricRow('Bout de code d’utilisation de l’ORM', 'Oui', 'Section 9.2'),
  rubricRow('Mise en place du JWT + explication', 'Oui', 'Section 7.3'),
  rubricRow('Présentation d’un test unitaire et fonctionnel', 'Oui', 'Section 10'),
  rubricRow('Solutions de déploiement front / back', 'Oui', 'Section 12 (deploy.sh)'),
  rubricRow('Démo vidéo ou live', 'Oui', 'Lien démo + capture commentée fournie'),
], [5400, 900, 3800]));

children.push(p('3.6 Bonus', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Critère bonus', 'Acquis', 'Référence'],
  rubricRow('Intégration d’une IA / fonctionnalité ML', 'Oui', 'Serveur MCP — section 11.1 — bring-your-own-AI'),
  rubricRow('Protections cyber-sécurité', 'Oui', 'Section 11.2 — bcrypt, JWT, CSP, UFW, fail2ban, sandbox iframe'),
  rubricRow('Résilience et disponibilité', 'Oui', 'Section 11.3 — PM2 (restart auto), sauvegarde SQLite quotidienne'),
  rubricRow('SEO et analytiques', 'Oui', 'Section 11.4 — meta tags, sitemap, Plausible-ready'),
  rubricRow('RGPD et vie privée', 'Oui', 'Section 11.5 — droit à l’oubli, consentement, blocage achats <18 ans'),
  rubricRow('PWA / hors ligne', 'Partiel', 'Section 11.6 — manifest + service worker prévus, build statique'),
  rubricRow('Paiement en ligne', 'Oui', 'Stripe SDK — section 11.7'),
  rubricRow('Serveur de mail', 'Oui', 'utils/mailer.js (Nodemailer + SMTP/Resend) — section 11.8'),
], [5400, 900, 3800]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 4. Architecture ─────────────────────────────────────────────────────────
children.push(heading('4. Architecture & infrastructure (VPS unique)'));
children.push(p('L’ensemble de la plateforme tourne sur un seul VPS Ubuntu. Nginx fait office de reverse proxy + serveur statique HTTPS pour les fronts, et redirige vers les services Node supervisés par PM2.'));

children.push(p('4.1 Schéma logique', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`Internet
   │  HTTPS 443 (Let's Encrypt)
   ▼
┌──────────────────────────────────────────────────────────┐
│              Nginx — reverse proxy + static              │
│                                                          │
│  slymfox.com / www          →  /opt/.../nexus-engine/dist│
│  marketplace.slymfox.com    →  /opt/.../marketplace/dist │
│  api.slymfox.com            →  127.0.0.1:3004            │
│  ws.slymfox.com             →  127.0.0.1:3001 (upgrade)  │
└──────────────────────────────────────────────────────────┘
                   │            │
   ┌───────────────┘            └────────────────┐
   ▼                                             ▼
PM2 marketplace-api                  PM2 nexus-engine-backend
Express 4 + Sequelize 6              Express 4 + ws (WebSocket)
SQLite (./db/marketplace.db)         Stockage projets JSON FS
`
));

children.push(p('4.2 Sous-domaines (DNS Cloudflare)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Type', 'Nom', 'Cible', 'Proxy CF'],
  ['A', '@', 'IP_VPS', 'Proxied'],
  ['A', 'www', 'IP_VPS', 'Proxied'],
  ['A', 'marketplace', 'IP_VPS', 'Proxied'],
  ['A', 'api', 'IP_VPS', 'Proxied'],
  ['A', 'ws', 'IP_VPS', 'Proxied'],
], [1400, 2600, 3000, 2400]));

children.push(p('4.3 Composants infra', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Composant', 'Rôle', 'Choix technique'],
  ['VPS', 'Hébergement unique', 'Ubuntu 22.04 / 24.04 LTS'],
  ['Reverse proxy', 'Terminaison TLS + routage', 'Nginx 1.22+'],
  ['TLS', 'Certificats auto-renouvelés', 'Certbot + Let’s Encrypt'],
  ['Process manager', 'Restart auto, logs, cluster', 'PM2 5.x (ecosystem.config.cjs)'],
  ['Pare-feu', 'Restriction ports', 'UFW (22/80/443 only)'],
  ['Anti-brute force', 'Protection SSH', 'fail2ban'],
  ['Sauvegarde', 'Backup quotidien SQLite', 'cron.daily + rétention 14j'],
  ['CDN/DDoS', 'Cache statique + WAF', 'Cloudflare (proxy orange)'],
], [3200, 3600, CONTENT - 6800]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 5. Stack technique ──────────────────────────────────────────────────────
children.push(heading('5. Stack technique détaillée'));

children.push(p('5.1 Nexus Engine — Studio (Vue 3 + Three.js)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Couche', 'Technologie', 'Version'],
  ['Framework UI', 'Vue 3 Composition API', '3.5.x'],
  ['State', 'Pinia', '2.3.x'],
  ['Build', 'Vite + vue-tsc', 'Vite 6'],
  ['Rendu 3D/2D', 'Three.js', 'r168'],
  ['Physique', 'Cannon-es (Web Worker)', '0.20.0'],
  ['Code editor', 'Monaco Editor', '0.52.0'],
  ['Typage', 'TypeScript', '5.6.x'],
  ['Identifiants', 'uuid', '10.x'],
], [2800, 4400, CONTENT - 7200]));

children.push(p('5.2 Marketplace — Front (Vue 3 + Tailwind)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Couche', 'Technologie', 'Version'],
  ['Framework UI', 'Vue 3', '3.5.x'],
  ['Routing', 'vue-router', '4.4.x'],
  ['State', 'Pinia', '2.3.x'],
  ['CSS', 'TailwindCSS + PostCSS', '3.4 / 8.4'],
  ['HTTP', 'fetch natif via lib/api.ts', '—'],
  ['Build', 'Vite', '6.x'],
], [2800, 4400, CONTENT - 7200]));

children.push(p('5.3 Marketplace API (Express + Sequelize)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Couche', 'Technologie', 'Version'],
  ['Runtime', 'Node.js', '20+ (testé sous 22.12)'],
  ['Framework HTTP', 'Express', '4.18+'],
  ['ORM', 'Sequelize', '6.37'],
  ['BDD', 'SQLite', '3.x (sqlite3 5.1.7)'],
  ['Auth', 'jsonwebtoken + bcrypt', '9.0 / 5.1'],
  ['Upload', 'multer', '1.4.5-lts'],
  ['Config', 'dotenv', '16.x'],
  ['Tests', 'Jest + Supertest', '30.x / 7.x'],
], [2800, 4400, CONTENT - 7200]));

children.push(p('5.4 Nexus Engine — Backend (Express + ws + MCP)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Couche', 'Technologie', 'Version'],
  ['Runtime', 'Node.js', '20+'],
  ['HTTP', 'Express', '4.21'],
  ['WebSocket', 'ws', '8.18'],
  ['MCP', '@modelcontextprotocol/sdk', 'dernière'],
  ['Vérif. token', 'Pont vers /api/auth/me du marketplace-api', '—'],
], [2800, 4400, CONTENT - 7200]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 6. Modules fonctionnels ─────────────────────────────────────────────────
children.push(heading('6. Modules fonctionnels livrés'));

children.push(p('6.1 Nexus Engine — Studio', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'Viewport Three.js avec OrbitControls, grille, gizmo de transformation.',
  'Scene Hierarchy — drag & drop, multi-sélection, opérations CRUD sur entités.',
  'Inspector — propriétés Transform, Material, Light, Physics (vec3 sliders, color picker).',
  'Bottom panel — Assets, Console, Animator, Layers.',
  'Code Editor Monaco intégré : autocomplete de l’API moteur, lifecycle onInit/onUpdate/onDestroy.',
  'ProjectWizard — création de projet 2D ou 3D avec préréglages gravité et caméra.',
  'TopBar — sauvegarde, build, publication directe vers la marketplace via JWT.',
  'Communication temps réel via WebSocket avec le backend Nexus (sync scène, autosave).',
].forEach(t => children.push(bullet(t)));

children.push(p('6.2 Marketplace', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'Page Home avec jeux mis en avant, populaires, récents.',
  'Catalogue filtrable (catégorie, prix, popularité) + recherche full-text.',
  'Page Jeu : description, captures, note, bouton jouer (iframe sandboxée plein écran).',
  'Player.vue — runner intégré, contrôles fullscreen, gestion du focus clavier.',
  'Profil joueur : bibliothèque, achats, statistiques de jeu.',
  'Dashboard développeur : projets, statistiques de revenus, clés API, webhook.',
  'Interface Admin — modération des soumissions, suspension, KPI plateforme.',
  'Page Auth — inscription/login avec persistance JWT en localStorage.',
  'ConfirmEmail — flux de vérification email transactionnel.',
].forEach(t => children.push(bullet(t)));

children.push(p('6.3 Économie', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'Achats in-app et jeux payants via Stripe Checkout.',
  'Webhook Stripe sécurisé par signature (STRIPE_WEBHOOK_SECRET).',
  'Reversement développeur 70 % / plateforme 30 %.',
  'Table purchases historisée + agrégation revenus par développeur.',
].forEach(t => children.push(bullet(t)));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 7. Backend ──────────────────────────────────────────────────────────────
children.push(heading('7. Backend — API REST + ORM + JWT'));

children.push(p('7.1 Bootstrap Express', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`// marketplace-api/index.js (extrait)
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { syncAndSeed } from './db/models.js'
import authRouter      from './routes/auth.js'
import gamesRouter     from './routes/games.js'
import projectsRouter  from './routes/projects.js'
import purchasesRouter from './routes/purchases.js'
import developerRouter from './routes/developer.js'
import mcpRouter       from './routes/mcp.js'
import adminRouter     from './routes/admin.js'

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(','), credentials: true }))
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_q, r) =>
  r.json({ status: 'ok', orm: 'sequelize', db: 'sqlite' }))

app.use('/api/auth',      authRouter)
app.use('/api/games',     gamesRouter)
app.use('/api/projects',  projectsRouter)
app.use('/api/purchases', purchasesRouter)
app.use('/api/developer', developerRouter)
app.use('/api/mcp',       mcpRouter)
app.use('/api/admin',     adminRouter)

syncAndSeed().then(() =>
  app.listen(process.env.PORT, () => console.log('[API] ready')))`
));

children.push(p('7.2 Routes complètes', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Méthode', 'Route', 'Description', 'Auth'],
  ['POST', '/api/auth/register', 'Inscription utilisateur', '—'],
  ['POST', '/api/auth/login', 'Connexion → JWT 7j', '—'],
  ['GET',  '/api/auth/me', 'Profil courant', 'Bearer'],
  ['POST', '/api/auth/refresh', 'Renouvellement de token', 'Bearer'],
  ['GET',  '/api/games', 'Catalogue publié', '—'],
  ['GET',  '/api/games/:slug', 'Détail d’un jeu', '—'],
  ['POST', '/api/games', 'Publier un nouveau jeu', 'Bearer (dev)'],
  ['PUT',  '/api/games/:id', 'Mise à jour (propriétaire)', 'Bearer'],
  ['DELETE','/api/games/:id', 'Suppression (propriétaire)', 'Bearer'],
  ['GET',  '/api/projects', 'Projets du dev courant', 'Bearer'],
  ['POST', '/api/projects', 'Créer un projet moteur', 'Bearer'],
  ['GET',  '/api/projects/:id', 'Récupération JSON projet', 'Bearer'],
  ['PUT',  '/api/projects/:id', 'Sauvegarde scène/scripts', 'Bearer'],
  ['DELETE','/api/projects/:id', 'Suppression', 'Bearer'],
  ['POST', '/api/purchases/checkout', 'Création session Stripe', 'Bearer'],
  ['GET',  '/api/purchases/my', 'Bibliothèque utilisateur', 'Bearer'],
  ['POST', '/api/purchases/webhook', 'Webhook Stripe signé', 'Stripe-Sig'],
  ['GET',  '/api/developer/stats', 'KPI dashboard dev', 'Bearer'],
  ['GET',  '/api/developer/games', 'Jeux publiés par dev', 'Bearer'],
  ['POST', '/api/developer/upload', 'Upload bundle de jeu', 'Bearer'],
  ['POST', '/api/mcp/token', 'Génération token MCP', 'Bearer'],
  ['GET',  '/api/mcp/games', 'Liste jeux (clé API)', 'ApiKey'],
  ['POST', '/api/mcp/games', 'Création via agent IA', 'ApiKey'],
  ['GET',  '/api/admin/*', 'Modération + KPI plateforme', 'Bearer admin'],
], [1300, 3100, CONTENT - 6400, 1900]));

children.push(p('7.3 Authentification JWT — mise en place et explication', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(p('L’authentification repose sur un JSON Web Token signé HS256 émis à la connexion ou à l’inscription. Le mot de passe est haché avec bcrypt (12 rounds). Le token contient { id, email, role } et expire au bout de 7 jours. Côté client il est stocké dans localStorage et ré-injecté dans le header Authorization à chaque requête.'));
children.push(code(
`// marketplace-api/routes/auth.js (extrait)
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User } from '../db/models.js'

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ where: { email } })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' })
  res.status(200).json({ token: signToken(user), user: safeUser(user) })
})`
));

children.push(p('Le middleware requireAuth lit le header, vérifie la signature, charge l’utilisateur via Sequelize, et l’attache à req.user pour les routes protégées :'));
children.push(code(
`// marketplace-api/middleware/auth.js (extrait)
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
}`
));

children.push(p('7.4 Extrait d’une route métier (Sequelize + JWT + validation)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`// marketplace-api/routes/games.js (extrait)
router.get('/', async (_req, res) => {
  const games = await Game.findAll({
    where: { status: 'published' },
    include: [{ model: Developer, include: [User] }],
    order: [['created_at', 'DESC']],
    limit: 50,
  })
  res.json({ games })
})

router.post('/', requireAuth, async (req, res) => {
  const { name, slug, description, category, price } = req.body
  if (!name || !slug) return res.status(400).json({ message: 'name/slug required' })
  const game = await Game.create({
    name, slug, description, category, price,
    developer_id: req.user.id,
    status: 'pending_review',
  })
  res.status(201).json({ game })
})`
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 8. Frontend ─────────────────────────────────────────────────────────────
children.push(heading('8. Frontend — Vue 3 responsive'));

children.push(p('8.1 Structure', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'src/views/* — pages routées (Home, Catalog, GamePage, Player, Auth, Dashboard, Admin, Profile, Engine, ConfirmEmail).',
  'src/components/* — composants réutilisables (GameCard, GameGrid, NavBar).',
  'src/stores/* — Pinia stores typés : authStore, gamesStore.',
  'src/router/index.ts — vue-router avec navigation guards (auth requise).',
  'src/lib/api.ts — wrapper fetch unique, injection automatique du Bearer token, parsing JSON, gestion d’erreur normalisée.',
].forEach(t => children.push(bullet(t)));

children.push(p('8.2 Composants réutilisables — exemple', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`<!-- src/components/GameCard.vue -->
<script setup lang="ts">
defineProps<{ game: { slug: string; name: string; thumbnail: string; price: number } }>()
</script>

<template>
  <RouterLink :to="\`/game/\${game.slug}\`"
    class="group rounded-xl overflow-hidden bg-slate-800 hover:scale-[1.02] transition">
    <img :src="game.thumbnail" :alt="game.name" class="aspect-video w-full object-cover" />
    <div class="p-3">
      <h3 class="font-semibold text-slate-100 truncate">{{ game.name }}</h3>
      <p class="text-sm text-orange-400">{{ game.price === 0 ? 'Gratuit' : game.price + ' €' }}</p>
    </div>
  </RouterLink>
</template>`
));

children.push(p('8.3 Consommation de l’API via fetch (lib/api.ts)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`// src/lib/api.ts
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
  login:    (email: string, password: string) =>
              request<{ token: string; user: User }>('/auth/login',
                { method: 'POST', body: JSON.stringify({ email, password }) }),
  listGames:() => request<{ games: Game[] }>('/games'),
  getGame:  (slug: string) => request<{ game: Game }>('/games/' + slug),
}`
));

children.push(p('8.4 Responsive — extrait Tailwind', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(p('Utilisation des breakpoints Tailwind pour adapter colonnes et navigation au mobile, tablette et desktop. Aucun media query CSS écrit à la main.'));
children.push(code(
`<!-- src/components/GameGrid.vue -->
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
</template>`
));

children.push(p('8.5 Authentification côté frontend — Pinia authStore', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`// src/stores/authStore.ts
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
})`
));
children.push(p('Navigation guard sur les routes protégées :'));
children.push(code(
`// src/router/index.ts
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'auth' }
  if (to.meta.requiresDev  && !auth.isDev)      return { name: 'home' }
})`
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 9. MCD ──────────────────────────────────────────────────────────────────
children.push(heading('9. Modèle de données (MCD)'));

children.push(p('9.1 Schéma relationnel', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`┌────────────┐         ┌──────────────┐         ┌────────────┐
│   USERS    │ 1 ──── 1│  DEVELOPERS  │ 1 ───── *│   GAMES    │
├────────────┤         ├──────────────┤         ├────────────┤
│ id (PK)    │         │ id (PK)      │         │ id (PK)    │
│ nom        │         │ user_id (FK) │         │ developer_id (FK)
│ prenom     │         │ api_key      │         │ name       │
│ email (U)  │         │ plan         │         │ slug (U)   │
│ password_  │         │ revenue_total│         │ description│
│  hash      │         │ webhook_url  │         │ category   │
│ birthday   │         │ mcp_enabled  │         │ price      │
│ role       │         └──────────────┘         │ status     │
│ is_verified│                                  │ thumbnail  │
└────┬───────┘                                  └─────┬──────┘
     │                                                │
     │  1                                          1  │
     │       ┌──────────────┐                         │
     └──────*│  PURCHASES   │*────────────────────────┘
            ├──────────────┤
            │ id (PK)      │         ┌──────────────┐
            │ user_id (FK) │         │  GAME_ITEMS  │
            │ game_id (FK) │ 1 ────*│ id (PK)      │
            │ amount       │         │ game_id (FK) │
            │ currency     │         │ name, type   │
            │ type         │         │ price        │
            │ stripe_id    │         │ metadata     │
            └──────────────┘         │ is_active    │
                                     └──────────────┘`
));

children.push(p('9.2 Définition Sequelize — bout de code ORM', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`// marketplace-api/db/models.js (extrait)
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
  is_banned:     { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: false })

export const Game = sequelize.define('Game', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  developer_id:  { type: DataTypes.INTEGER },
  name:          { type: DataTypes.STRING,  allowNull: false },
  slug:          { type: DataTypes.STRING,  allowNull: false, unique: true },
  category:      { type: DataTypes.STRING,  defaultValue: 'Other' },
  price:         { type: DataTypes.FLOAT,   defaultValue: 0 },
  status:        { type: DataTypes.STRING,  defaultValue: 'draft' },
}, { tableName: 'games', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })

// Associations
Developer.belongsTo(User,  { foreignKey: 'user_id' })
User.hasOne(Developer,     { foreignKey: 'user_id' })
Game.belongsTo(Developer,  { foreignKey: 'developer_id' })
Developer.hasMany(Game,    { foreignKey: 'developer_id' })

await sequelize.sync({ alter: true }) // migrations gérées par Sequelize`
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 10. Tests ───────────────────────────────────────────────────────────────
children.push(heading('10. Tests unitaires & fonctionnels'));

children.push(p('Trois suites Jest sont fournies : auth unit, games unit, API functional (Supertest). Exécution :'));
children.push(code(
`cd marketplace-api
npm test                # toutes les suites
npm run test:unit       # uniquement unitaires
npm run test:functional # uniquement fonctionnels (nécessite l’API live)`
));

children.push(p('10.1 Test unitaire (extrait) — bcrypt + JWT', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`// marketplace-api/tests/unit/auth.test.js
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

describe('JWT token generation', () => {
  it('should create a valid JWT', () => {
    const token = jwt.sign({ id: 1, email: 'a@b.c', role: 'user' },
      'test_secret', { expiresIn: '7d' })
    expect(token.split('.').length).toBe(3)
  })

  it('should reject an expired token', async () => {
    const t = jwt.sign({ id: 1 }, 'test_secret', { expiresIn: '0s' })
    await new Promise(r => setTimeout(r, 100))
    expect(() => jwt.verify(t, 'test_secret')).toThrow('jwt expired')
  })
})`
));

children.push(p('10.2 Test fonctionnel (extrait) — Supertest', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(code(
`// marketplace-api/tests/functional/api.test.js
import request from 'supertest'

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

  it('should reject duplicate email', async () => {
    const res = await request('http://localhost:3004')
      .post('/api/auth/register').send(testUser).expect(409)
    expect(res.body).toHaveProperty('message')
  })
})`
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 11. Bonus ───────────────────────────────────────────────────────────────
children.push(heading('11. Bonus livrés'));

children.push(p('11.1 Intégration IA — serveur MCP (Model Context Protocol)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(p('Le serveur MCP expose des outils permettant à n’importe quelle IA compatible (Claude Desktop, Continue, Cursor, OpenAI Agents…) de piloter le moteur Nexus. Le développeur apporte sa propre clé IA : la plateforme ne stocke aucun token de modèle.'));
children.push(dataTable([
  ['Outil MCP', 'Capacité'],
  ['scene_read / scene_write', 'Lecture/écriture de la scène active (entités, transforms)'],
  ['script_read / script_write', 'Accès au contenu des scripts JS du projet'],
  ['asset_list', 'Liste des assets uploadés (sprites, 3D, audio)'],
  ['physics_config', 'Lecture/écriture de la gravité et des paramètres Cannon-es'],
  ['npc_prompt', 'Pilotage du comportement d’un NPC piloté par IA'],
], [3200, CONTENT - 3200]));

children.push(p('11.2 Cyber-sécurité', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'Mots de passe hachés avec bcrypt (12 rounds) — jamais en clair.',
  'JWT HS256 signé avec un secret 64 chars auto-généré par deploy.sh.',
  'CORS strict avec liste blanche d’origines (CORS_ORIGINS).',
  'Headers Nginx : HSTS, X-Frame-Options, CSP frame-ancestors restrictifs.',
  'Sandbox iframe pour l’exécution des jeux + Content Security Policy stricte.',
  'UFW : seuls 22/80/443 ouverts. fail2ban contre brute-force SSH.',
  'TLS 1.2+ obligatoire, certificats Let’s Encrypt renouvelés auto.',
  'Validation des entrées + 404/500 gérés par middleware global.',
  'Secrets jamais commités : .env exclu via .gitignore, .env.example versionné.',
].forEach(t => children.push(bullet(t)));

children.push(p('11.3 Résilience & disponibilité', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'PM2 — redémarrage automatique sur crash, max_memory_restart 400 Mo.',
  'PM2 startup systemd — démarrage automatique au boot du VPS.',
  'Sauvegarde quotidienne SQLite via cron.daily, rétention 14 jours.',
  'Health-check /api/health interrogeable par monitoring externe.',
  'Cloudflare en frontal — cache CDN + protection DDoS.',
].forEach(t => children.push(bullet(t)));

children.push(p('11.4 SEO & analytiques', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'Meta tags Open Graph + Twitter Card sur les pages jeux.',
  'Sitemap.xml généré dynamiquement par l’API.',
  'URLs sluguées /game/:slug pour le partage social.',
  'Plausible Analytics prêt à brancher (script injecté via .env).',
].forEach(t => children.push(bullet(t)));

children.push(p('11.5 RGPD & vie privée', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'Collecte de la date de naissance pour gating < 18 ans sur les achats.',
  'Bandeau de consentement cookies (essentiels uniquement par défaut).',
  'Droit à l’oubli — endpoint DELETE /api/auth/me purge soft + hard via cron.',
  'Politique de confidentialité versionnée.',
  'Aucune donnée envoyée à des tiers sans consentement explicite.',
].forEach(t => children.push(bullet(t)));

children.push(p('11.6 PWA / hors-ligne (partiel)', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(p('Le marketplace est servi en build statique, parfaitement compatible PWA. Le manifest et le service worker (vite-plugin-pwa) sont prévus pour cacher les assets et la liste des jeux récents en offline. Le runner de jeu lui-même est par nature online (assets distants).'));

children.push(p('11.7 Paiement en ligne — Stripe', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
[
  'Stripe Checkout pour les achats one-time (jeux payants).',
  'Stripe Customer Portal pour la gestion d’abonnement développeur.',
  'Webhook /api/purchases/webhook signé via STRIPE_WEBHOOK_SECRET.',
  'Devise EUR par défaut, support multi-devises prêt côté schéma.',
].forEach(t => children.push(bullet(t)));

children.push(p('11.8 Serveur de mail', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(p('Fichier marketplace-api/utils/mailer.js — Nodemailer compatible SMTP générique (Mailtrap en dev, Resend / Amazon SES en prod). Configuration via variables d’environnement, DKIM + SPF documentés côté DNS (Resend & SES).'));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 12. Déploiement ─────────────────────────────────────────────────────────
children.push(heading('12. Déploiement détaillé (deploy.sh, VPS unique)'));
children.push(p('Le script deploy.sh fourni à la racine du dépôt automatise la totalité du déploiement sur un seul VPS Ubuntu. Une commande, tout est en ligne.'));
children.push(code(
`# Sur le VPS, en root :
git clone -b nexus-engine https://github.com/Aiglator/eemi-gameforge.git /tmp/app
cd /tmp/app
sudo ADMIN_EMAIL=admin@slymfox.com bash deploy.sh

# → installe Node 20, Nginx, certbot, PM2, sqlite3, fail2ban, ufw
# → clone le repo dans /opt/gameforge sous l'utilisateur 'gameforge'
# → génère les .env (JWT_SECRET auto, CORS, URLs publiques)
# → npm install + build pour nexus-engine, marketplace, marketplace-api
# → PM2 start ecosystem.config.cjs + pm2 startup systemd
# → 4 vhosts Nginx + Let's Encrypt sur 5 sous-domaines
# → UFW autorise SSH + Nginx Full
# → cron.daily sauvegarde SQLite (rétention 14j)`
));

children.push(p('Solutions retenues — pourquoi ?', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Choix', 'Justification'],
  ['Un seul VPS', 'Simplicité d’opération et coût maîtrisé pour le MVP. La séparation logique est portée par Nginx (vhosts) et PM2.'],
  ['Nginx + statique pour les fronts', 'Pas de coût Node pour servir le HTML/JS/CSS, cache long sur assets hashés, gzip activé.'],
  ['PM2', 'Restart automatique, logs, déploiement zéro-downtime via pm2 reload, démarrage au boot via systemd.'],
  ['Let’s Encrypt', 'TLS gratuit, renouvellement auto via systemd timer, 5 sous-domaines couverts par une seule commande.'],
  ['SQLite', 'Tient jusqu’à ~10 000 utilisateurs actifs sans tuning, sauvegarde simple (un fichier), aucune dépendance externe.'],
  ['Cloudflare devant', 'Cache CDN, protection DDoS, WAF gratuit, possibilité de proxy WebSocket.'],
], [3000, CONTENT - 3000]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 13. Démo ────────────────────────────────────────────────────────────────
children.push(heading('13. Démonstration & supports de présentation'));
children.push(p('La présentation est articulée autour de deux supports :'));
[
  'Un deck Gamma généré à partir du prompt fourni — couvrant chaque case de la grille (architecture, MCD, JWT, ORM, tests, déploiement).',
  'Une démo live de 5 minutes : connexion → création projet → édition scène 3D → script JS → publication → catalogue → achat Stripe (mode test) → relance du jeu publié.',
].forEach(t => children.push(bullet(t)));
children.push(p('Capture vidéo de secours fournie en cas de problème réseau (mockups HTML jouables localement)'));

// ── 14. Roadmap & risques ───────────────────────────────────────────────────
children.push(heading('14. Roadmap & risques'));

children.push(p('Roadmap', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Version', 'Périmètre'],
  ['v1.0 (livrée)', 'Moteur 2D/3D Three.js + Cannon-es, scripting Monaco, marketplace, API REST + ORM, JWT, Stripe, MCP, déploiement VPS.'],
  ['v1.1', 'PWA complète, signaler/modérer, multi-langue, dashboard admin avancé.'],
  ['v2.0', 'Migration PostgreSQL au-delà de 10k DAU, multi-instance PM2, S3/B2 pour les assets.'],
  ['v3.0', 'SDK JS public, marketplace de plugins moteur, fédération MCP.'],
], [2400, CONTENT - 2400]));

children.push(p('Risques & mitigations', { bold: true, size: 24, color: COLOR.primary2, spacingBefore: 200 }));
children.push(dataTable([
  ['Risque', 'Niveau', 'Mitigation'],
  ['Sandbox scripting user', 'CRITIQUE', 'iframe sandboxée + CSP strict + timeout 5s + audit avant chaque release majeure.'],
  ['Perf Three.js mobile', 'CRITIQUE', 'Limite polygones/textures, fallback Canvas 2D, profilage continu.'],
  ['RGPD & mineurs', 'MOYEN', 'birthday obligatoire, gating <18 ans, consentement, droit à l’oubli.'],
  ['Scalabilité SQLite', 'MOYEN', 'Migration PostgreSQL planifiée v2.0, backups quotidiens dès v1.'],
  ['Contenu inapproprié', 'FAIBLE', 'Modération admin (status pending_review), signalement joueurs, suspension auto.'],
], [3000, 1400, CONTENT - 4400]));

children.push(new Paragraph({ spacing: { before: 600, after: 0 } }));
children.push(p('— Document généré par l’équipe GameForge / SlymFox, version Hackathon — slymfox.com',
  { italic: true, align: AlignmentType.CENTER, color: COLOR.textMute, size: 20 }));

// ── Document Build ──────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'Equipe GameForge',
  title: 'Cahier des charges GameForge — Hackathon Full Stack',
  description: 'CDC mis à jour pour la livraison Hackathon — VPS unique.',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Calibri', color: COLOR.primary },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Calibri', color: COLOR.primary2 },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
        ] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'GameForge — Cahier des charges v2 (Hackathon)',
            italics: true, color: COLOR.textMute, size: 18, font: 'Calibri' })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: 'slymfox.com', color: COLOR.textMute, size: 18, font: 'Calibri' }),
            new TextRun({ text: '\tPage ', color: COLOR.textMute, size: 18, font: 'Calibri' }),
            new TextRun({ children: [PageNumber.CURRENT], color: COLOR.textMute, size: 18, font: 'Calibri' }),
            new TextRun({ text: ' / ', color: COLOR.textMute, size: 18, font: 'Calibri' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], color: COLOR.textMute, size: 18, font: 'Calibri' }),
          ],
        })],
      }),
    },
    children,
  }],
});

const outputPath = process.argv[2] || 'CDC_GameForge_v2.docx';
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log('✓ Written', outputPath, '(', buf.length, 'bytes )');
});
