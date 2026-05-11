#!/usr/bin/env bash
# ============================================================================
#  GameForge / SlymFox — deploy.sh
#  Déploiement complet en un script sur un seul VPS Ubuntu 22.04 / 24.04
#  ---------------------------------------------------------------------------
#  Architecture servie derrière Nginx + HTTPS (Let's Encrypt) :
#    - slymfox.com                → Nexus Engine Studio (Vue 3, build statique)
#    - marketplace.slymfox.com    → Marketplace front (Vue 3, build statique)
#    - api.slymfox.com            → marketplace-api (Express + Sequelize, PM2)
#    - ws.slymfox.com             → nexus-engine backend WS (Express+ws, PM2)
#
#  Pré-requis :
#    1. Un VPS Ubuntu fraîchement provisionné, accès root ou sudo.
#    2. Les enregistrements DNS A créés et propagés vers l'IP du VPS :
#         slymfox.com  www  marketplace  api  ws
#       (Proxy Cloudflare en "DNS only" pendant la 1ère exécution certbot ;
#        réactivable en "Proxied" ensuite — voir bloc Cloudflare en fin.)
#    3. Un email admin pour les notifications Let's Encrypt.
#
#  Utilisation :
#    sudo ADMIN_EMAIL=you@slymfox.com bash deploy.sh
#  Variables surchargables :
#    DOMAIN           (default: slymfox.com)
#    ADMIN_EMAIL      (default: admin@${DOMAIN})
#    REPO_URL         (default: https://github.com/Aiglator/<repo>.git)
#    BRANCH           (default: nexus-engine)
#    APP_USER         (default: gameforge)
#    APP_DIR          (default: /opt/gameforge)
#    JWT_SECRET       (default: auto-généré 64 chars)
#    STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (default: vides — à compléter)
# ============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

# ── Variables ────────────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-slymfox.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"
REPO_URL="${REPO_URL:-https://github.com/Aiglator/gameforge.git}"
BRANCH="${BRANCH:-nexus-engine}"
APP_USER="${APP_USER:-gameforge}"
APP_DIR="${APP_DIR:-/opt/gameforge}"
NODE_MAJOR="${NODE_MAJOR:-20}"

# Sous-domaines
ROOT_DOMAIN="${DOMAIN}"
WWW_DOMAIN="www.${DOMAIN}"
MKT_DOMAIN="marketplace.${DOMAIN}"
API_DOMAIN="api.${DOMAIN}"
WS_DOMAIN="ws.${DOMAIN}"

# Secrets
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"

# Ports internes (loopback only, jamais exposés)
NEXUS_BACK_PORT=3001
MARKETPLACE_API_PORT=3004

log()  { printf "\n\033[1;36m[deploy]\033[0m %s\n" "$*"; }
warn() { printf "\n\033[1;33m[warn]\033[0m  %s\n" "$*" >&2; }
die()  { printf "\n\033[1;31m[fail]\033[0m  %s\n" "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || die "Lance ce script en root : sudo bash deploy.sh"

# ── 1. Système : mise à jour et paquets ──────────────────────────────────────
log "1/9 — Mise à jour APT et installation des paquets de base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  curl wget gnupg2 ca-certificates lsb-release \
  build-essential git ufw \
  nginx certbot python3-certbot-nginx \
  sqlite3 fail2ban htop unzip

# ── 2. Node.js LTS + PM2 ─────────────────────────────────────────────────────
log "2/9 — Installation de Node.js ${NODE_MAJOR}.x via NodeSource"
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/v//;s/\..*//')" -lt "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

# ── 3. Utilisateur applicatif ────────────────────────────────────────────────
log "3/9 — Création de l'utilisateur applicatif '${APP_USER}'"
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  adduser --system --group --home "${APP_DIR}" --shell /bin/bash "${APP_USER}"
fi
# Force /bin/bash : adduser --system ignore parfois --shell sur Ubuntu 24.04
chsh -s /bin/bash "${APP_USER}" || true
mkdir -p "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ── 4. Clone / pull du dépôt ─────────────────────────────────────────────────
log "4/9 — Récupération du code (${REPO_URL} @ ${BRANCH})"
if [[ -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" git -C "${APP_DIR}" fetch --all
  sudo -u "${APP_USER}" git -C "${APP_DIR}" checkout "${BRANCH}"
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  sudo -u "${APP_USER}" git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

# ── 5. Variables d'environnement ─────────────────────────────────────────────
log "5/9 — Génération des fichiers .env"

# marketplace-api
cat > "${APP_DIR}/marketplace-api/.env" <<EOF
PORT=${MARKETPLACE_API_PORT}
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=./db/marketplace.db
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
CORS_ORIGINS=https://${ROOT_DOMAIN},https://${WWW_DOMAIN},https://${MKT_DOMAIN}
EOF

# nexus-engine backend
cat > "${APP_DIR}/nexus-engine/.env" <<EOF
PORT=${NEXUS_BACK_PORT}
NODE_ENV=production
MARKETPLACE_API_URL=https://${API_DOMAIN}/api
EOF

# Front builds — URL publiques injectées au build
cat > "${APP_DIR}/marketplace/.env" <<EOF
VITE_API_URL=https://${API_DOMAIN}/api
VITE_ENGINE_URL=https://${ROOT_DOMAIN}
VITE_WS_URL=wss://${WS_DOMAIN}
EOF

cat > "${APP_DIR}/nexus-engine/.env.production" <<EOF
VITE_API_URL=https://${API_DOMAIN}/api
VITE_MARKETPLACE_URL=https://${MKT_DOMAIN}
VITE_WS_URL=wss://${WS_DOMAIN}
EOF

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ── 6. Installation des dépendances et build ─────────────────────────────────
log "6/9 — npm install + build pour chaque service"
# IMPORTANT : on installe TOUTES les deps (y compris dev) — vue-tsc / vite sont
# en devDependencies et sont indispensables pour `npm run build`.
for SVC in marketplace-api nexus-engine marketplace; do
  log "  → ${SVC}"
  sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}/${SVC}' && npm install --no-audit --no-fund"
done

# Build des fronts (Vite)
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}/nexus-engine' && npm run build"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}/marketplace'   && npm run build"

# Vérification des dossiers de build
[[ -d "${APP_DIR}/nexus-engine/dist" ]] || die "Build nexus-engine introuvable : ${APP_DIR}/nexus-engine/dist"
[[ -d "${APP_DIR}/marketplace/dist"   ]] || die "Build marketplace introuvable : ${APP_DIR}/marketplace/dist"

# Économise l'espace en retirant les devDependencies de l'API (qui ne build pas)
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}/marketplace-api' && npm prune --omit=dev" || true

# ── 7. PM2 — supervision des backends ────────────────────────────────────────
log "7/9 — Configuration PM2"
cat > "${APP_DIR}/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [
    {
      name: 'marketplace-api',
      cwd:  '${APP_DIR}/marketplace-api',
      script: 'index.js',
      node_args: '--enable-source-maps',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      out_file: '${APP_DIR}/logs/marketplace-api.out.log',
      error_file: '${APP_DIR}/logs/marketplace-api.err.log',
      time: true,
    },
    {
      name: 'nexus-engine-backend',
      cwd:  '${APP_DIR}/nexus-engine',
      script: 'backend/server.js',
      node_args: '--enable-source-maps',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      out_file: '${APP_DIR}/logs/nexus-engine.out.log',
      error_file: '${APP_DIR}/logs/nexus-engine.err.log',
      time: true,
    },
  ],
};
EOF
mkdir -p "${APP_DIR}/logs"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# startOrReload : démarre la 1ère fois, puis reload (zero-downtime) sur ré-exécution
# -H : positionne HOME correctement pour que PM2 trouve son daemon
sudo -u "${APP_USER}" -H bash -lc "cd '${APP_DIR}' && pm2 startOrReload ecosystem.config.cjs"
sudo -u "${APP_USER}" -H pm2 save

# Démarrage auto au boot
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "${APP_USER}" --hp "${APP_DIR}" | tail -1 | bash

# ── 8. Nginx — reverse proxy + statiques ─────────────────────────────────────
log "8/9 — Configuration Nginx"

# Limites globales (corps des requêtes pour upload assets)
cat > /etc/nginx/conf.d/gameforge.conf <<'EOF'
client_max_body_size 50M;
proxy_read_timeout   300s;
proxy_send_timeout   300s;
gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_min_length 1024;
EOF

# slymfox.com + www → Nexus Engine Studio (statique)
cat > /etc/nginx/sites-available/${ROOT_DOMAIN} <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name ${ROOT_DOMAIN} ${WWW_DOMAIN};

  root ${APP_DIR}/nexus-engine/dist;
  index index.html;

  # SPA fallback
  location / {
    try_files \$uri \$uri/ /index.html;
  }

  # Cache long pour les assets hashés Vite
  location ~* \.(?:js|css|woff2?|svg|png|jpg|jpeg|webp|gif|ico)\$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files \$uri =404;
  }
}
EOF

# marketplace.slymfox.com → Marketplace front (statique)
cat > /etc/nginx/sites-available/${MKT_DOMAIN} <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name ${MKT_DOMAIN};

  root ${APP_DIR}/marketplace/dist;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  location ~* \.(?:js|css|woff2?|svg|png|jpg|jpeg|webp|gif|ico)\$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files \$uri =404;
  }
}
EOF

# api.slymfox.com → marketplace-api (reverse proxy + static games)
cat > /etc/nginx/sites-available/${API_DOMAIN} <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name ${API_DOMAIN};

  # CORS géré côté Express — on relaie seulement
  location / {
    proxy_pass         http://127.0.0.1:${MARKETPLACE_API_PORT};
    proxy_http_version 1.1;
    proxy_set_header   Host              \$host;
    proxy_set_header   X-Real-IP         \$remote_addr;
    proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto \$scheme;
    proxy_connect_timeout 60s;
    proxy_read_timeout    300s;
  }
}
EOF

# ws.slymfox.com → backend Nexus (HTTP + WebSocket upgrade)
cat > /etc/nginx/sites-available/${WS_DOMAIN} <<EOF
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  listen [::]:80;
  server_name ${WS_DOMAIN};

  location / {
    proxy_pass         http://127.0.0.1:${NEXUS_BACK_PORT};
    proxy_http_version 1.1;
    proxy_set_header   Upgrade           \$http_upgrade;
    proxy_set_header   Connection        \$connection_upgrade;
    proxy_set_header   Host              \$host;
    proxy_set_header   X-Real-IP         \$remote_addr;
    proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto \$scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }
}
EOF

# Activation des sites
for SITE in "${ROOT_DOMAIN}" "${MKT_DOMAIN}" "${API_DOMAIN}" "${WS_DOMAIN}"; do
  ln -sf "/etc/nginx/sites-available/${SITE}" "/etc/nginx/sites-enabled/${SITE}"
done
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

# ── 9. Certificats Let's Encrypt ─────────────────────────────────────────────
log "9/9 — Certbot (Let's Encrypt) — agreement: ${ADMIN_EMAIL}"
certbot --nginx --non-interactive --agree-tos --redirect \
  --email "${ADMIN_EMAIL}" \
  -d "${ROOT_DOMAIN}" \
  -d "${WWW_DOMAIN}" \
  -d "${MKT_DOMAIN}" \
  -d "${API_DOMAIN}" \
  -d "${WS_DOMAIN}"

# Renouvellement auto (déjà fait via systemd timer fourni par le paquet certbot)
systemctl enable --now certbot.timer

# ── Firewall UFW ─────────────────────────────────────────────────────────────
log "Firewall UFW : on n'ouvre que SSH, HTTP, HTTPS"
ufw allow OpenSSH
ufw allow 'Nginx Full'
yes | ufw enable || true

# ── Sauvegarde quotidienne SQLite ────────────────────────────────────────────
log "Sauvegarde quotidienne SQLite via cron"
cat > /etc/cron.daily/gameforge-backup <<EOF
#!/usr/bin/env bash
set -e
DEST="${APP_DIR}/backups"
mkdir -p "\${DEST}"
sqlite3 "${APP_DIR}/marketplace-api/db/marketplace.db" ".backup '\${DEST}/marketplace-\$(date +%F).db'"
find "\${DEST}" -name 'marketplace-*.db' -mtime +14 -delete
chown -R ${APP_USER}:${APP_USER} "\${DEST}"
EOF
chmod +x /etc/cron.daily/gameforge-backup

# ── Récapitulatif ────────────────────────────────────────────────────────────
cat <<EOF

============================================================================
  Déploiement terminé ✓
----------------------------------------------------------------------------
  Studio   : https://${ROOT_DOMAIN}
  Studio   : https://${WWW_DOMAIN}
  Market   : https://${MKT_DOMAIN}
  API      : https://${API_DOMAIN}/api/health
  WS Nexus : wss://${WS_DOMAIN}

  Logs    :  sudo -u ${APP_USER} pm2 logs
  Status  :  sudo -u ${APP_USER} pm2 status
  Restart :  sudo -u ${APP_USER} pm2 restart all
  Renew   :  certbot renew --dry-run

  JWT_SECRET généré (à conserver, ne sera pas réaffiché) :
    ${JWT_SECRET}
============================================================================

Cloudflare : si proxy "Proxied" (orange) — passe SSL/TLS en "Full (strict)"
et installe l'Origin Certificate ; sinon laisse "DNS only" (gris).
EOF
