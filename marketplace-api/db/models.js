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
  email_confirm_token_hash: { type: DataTypes.STRING },
  email_confirm_expires_at: { type: DataTypes.DATE },
}, { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: false })

export const Developer = sequelize.define('Developer', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false, unique: true },
  api_key:      { type: DataTypes.STRING,  unique: true },
  plan:         { type: DataTypes.STRING,  defaultValue: 'free' },
  revenue_total:{ type: DataTypes.FLOAT,   defaultValue: 0 },
  webhook_url:  { type: DataTypes.STRING },
  mcp_enabled:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'developers', timestamps: false })

export const Game = sequelize.define('Game', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  developer_id: { type: DataTypes.INTEGER },
  name:         { type: DataTypes.STRING,  allowNull: false },
  slug:         { type: DataTypes.STRING,  allowNull: false, unique: true },
  description:  { type: DataTypes.TEXT },
  category:     { type: DataTypes.STRING,  defaultValue: 'Other' },
  price:        { type: DataTypes.FLOAT,   defaultValue: 0 },
  player_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status:       { type: DataTypes.STRING,  defaultValue: 'draft' },
  engine_version:{ type: DataTypes.STRING, defaultValue: '2.0' },
  project_path: { type: DataTypes.TEXT },
  thumbnail:    { type: DataTypes.STRING },
}, { tableName: 'games', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })

export const Purchase = sequelize.define('Purchase', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:  { type: DataTypes.INTEGER },
  game_id:  { type: DataTypes.INTEGER },
  amount:   { type: DataTypes.FLOAT,  defaultValue: 0 },
  currency: { type: DataTypes.STRING, defaultValue: 'usd' },
  type:     { type: DataTypes.STRING, defaultValue: 'game' },
  stripe_id:{ type: DataTypes.STRING },
}, { tableName: 'purchases', timestamps: true, createdAt: 'created_at', updatedAt: false })

export const GameItem = sequelize.define('GameItem', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  game_id:  { type: DataTypes.INTEGER },
  name:     { type: DataTypes.STRING, allowNull: false },
  type:     { type: DataTypes.STRING, defaultValue: 'cosmetic' },
  price:    { type: DataTypes.FLOAT,  defaultValue: 0 },
  metadata: { type: DataTypes.TEXT },
  is_active:{ type: DataTypes.INTEGER, defaultValue: 1 },
}, { tableName: 'game_items', timestamps: false })

// Associations
Developer.belongsTo(User,     { foreignKey: 'user_id' })
User.hasOne(Developer,        { foreignKey: 'user_id' })
Game.belongsTo(Developer,     { foreignKey: 'developer_id' })
Developer.hasMany(Game,       { foreignKey: 'developer_id' })
Purchase.belongsTo(User,      { foreignKey: 'user_id' })
Purchase.belongsTo(Game,      { foreignKey: 'game_id' })
Game.hasMany(GameItem,        { foreignKey: 'game_id' })

export async function syncAndSeed() {
  // Disable FK enforcement so ALTER TABLE (SQLite drop+recreate) works cleanly
  await sequelize.query('PRAGMA foreign_keys = OFF')
  await sequelize.sync()
  await sequelize.query('PRAGMA foreign_keys = ON')

  // Seed demo data — uses findOrCreate so restarts never destroy data or API keys
  {
    const bcrypt = await import('bcrypt')

    // Admin account
    const adminHash = await bcrypt.default.hash('admin123456', 12)
    await User.findOrCreate({
      where: { email: 'admin@slymfox.com' },
      defaults: {
        nom: 'Admin', prenom: 'GameForge', email: 'admin@slymfox.com',
        password_hash: adminHash, role: 'admin', is_verified: 1,
      }
    })

    const hash = await bcrypt.default.hash('demo123456', 12)
    const [user] = await User.findOrCreate({
      where: { email: 'demo@slymfox.com' },
      defaults: { nom: 'Demo', prenom: 'Developer', email: 'demo@slymfox.com', password_hash: hash, role: 'developer', is_verified: 1 }
    })
    // Preserve existing API key — search by api_key to avoid unique constraint if user_id changed
    const [dev] = await Developer.findOrCreate({
      where: { api_key: 'demo_api_key_123' },
      defaults: { user_id: user.id, api_key: 'demo_api_key_123', plan: 'pro' }
    })
    // If it was found by api_key, ensure it's linked to the correct (new) user email if needed
    if (dev.user_id !== user.id) {
      await dev.update({ user_id: user.id });
    }
    // Ensure we use the correct ID for the games seed, even if findOrCreate found an existing one
    const developer_id = dev.id;
    const games = [
      // ── Jeux avec fichiers réels ────────────────────────────────────────────────────────────────────
      { name: 'Nexus Runner',          slug: 'nexus-runner',          description: 'Platformer 2D infini généré procéduralement. Double saut, ennemis, pièces. Construit avec Canvas 2D API.',                                                                          category: 'Platformer', price: 0,    player_count: 1247, project_path: '/static/nexus-runner/index.html',          engine_version: '2.0' },
      { name: 'Slime Awakening',       slug: 'slime-awakening',       description: 'Pixel art platformer. Tu incarnes KORX, un scientifique muté en slime. Absorbe tes ennemis, mute, survie. 3 zones + boss. Rendu pixel art 320×180 upscalé 4×.',                   category: 'Platformer', price: 0,    player_count: 489,  project_path: '/static/slime-awakening/index.html',          engine_version: '2.0' },
      { name: 'Stray Light Nightmare', slug: 'stray-light-nightmare', description: 'Horreur atmosphérique 3D. Labyrinthe procédural avec Three.js r168. Post-processing ultra-complexe : bloom, aberration chromatique, SSAO, grain cinématique, colorimétrie LUT. Entités lumineuses, système de peur dynamique.',  category: 'Horror',     price: 0,    player_count: 312,  project_path: '/static/stray-light-nightmare/index.html',    engine_version: '2.0' },
      { name: 'Neon Assault',          slug: 'neon-assault',          description: 'Bullet hell synthwave. Vaisseaux, boss, missiles guidés, bouclier, combo system. Difficulté progressive par vagues. Son procédural Web Audio API.',                                 category: 'Action',     price: 0,    player_count: 2104, project_path: '/static/neon-assault/index.html',             engine_version: '2.0' },
      { name: 'Void Blocks',           slug: 'void-blocks',           description: 'Tetris edition Nexus. Ghost piece, hard drop, niveaux progressifs, effets de flash sur les lignes complètes. Rendu neon sur fond sombre.',                                          category: 'Puzzle',     price: 0,    player_count: 3401, project_path: '/static/void-blocks/index.html',               engine_version: '2.0' },
      // ── Jeux placeholder (à développer) ───────────────────────────────────────────────────────────
      { name: 'Space Explorer',        slug: 'space-explorer',        description: 'Explorez des galaxies générées procéduralement. Collecte de ressources, factions, crafting.',                                                                                       category: 'Adventure',  price: 0,    player_count: 842 },
      { name: 'Nexus Dungeon',         slug: 'nexus-dungeon',         description: 'Dungeon crawler sombre avec combat physique Cannon-es. Armes procédurales, boss légendaires.',                                                                                       category: 'Action',     price: 4.99, player_count: 317 },
      { name: 'Terrain Quest',         slug: 'terrain-quest',         description: 'Explorez des terrains procéduraux massifs. Biomes variés, ruines, faune hostile.',                                                                                                  category: 'Sandbox',    price: 0,    player_count: 1204 },
      { name: 'Void Runner',      slug: 'void-runner',      description: 'Platformer neon ultra-rapide. Généré procéduralement, obstacles impossibles, musique synchronisée.',       category: 'Platformer', price: 0,    player_count: 726 },
      { name: 'Fortress Builder', slug: 'fortress-builder', description: 'Construis et défends ta forteresse contre des vagues infinies. Économie, tours, unités.',                               category: 'Strategy',   price: 9.99, player_count: 158 },
      { name: 'Puzzle Cubes',     slug: 'puzzle-cubes',     description: 'Puzzle physique minimaliste. Empile les cubes, active les interrupteurs, gravité variable.',                            category: 'Puzzle',     price: 1.99, player_count: 593 },
    ]
    for (const g of games) {
      await Game.findOrCreate({
        where: { slug: g.slug },
        defaults: { ...g, developer_id, status: 'published' }
      })
    }
  }
}
