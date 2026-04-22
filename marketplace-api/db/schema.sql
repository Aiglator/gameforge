CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  birthday TEXT,
  role TEXT DEFAULT 'user',
  is_verified INTEGER DEFAULT 0,
  is_banned INTEGER DEFAULT 0,
  email_confirm_token_hash TEXT,
  email_confirm_expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS developers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  api_key TEXT UNIQUE,
  api_secret_hash TEXT,
  plan TEXT DEFAULT 'free',
  revenue_total REAL DEFAULT 0,
  payout_info TEXT,
  webhook_url TEXT,
  mcp_enabled INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  developer_id INTEGER REFERENCES developers(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Other',
  price REAL DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  engine_version TEXT DEFAULT '2.0',
  project_path TEXT,
  thumbnail TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  item_id INTEGER,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  type TEXT DEFAULT 'game',
  stripe_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER REFERENCES games(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'cosmetic',
  price REAL DEFAULT 0,
  metadata TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);
CREATE INDEX IF NOT EXISTS idx_games_slug     ON games(slug);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
