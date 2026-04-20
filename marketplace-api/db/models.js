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
  await sequelize.sync({ alter: true })
  await sequelize.query('PRAGMA foreign_keys = ON')

  // Seed demo data if no games
  const count = await Game.count()
  if (count === 0) {
    const bcrypt = await import('bcrypt')
    const hash = await bcrypt.default.hash('demo123456', 12)
    const user = await User.create({
      nom: 'Demo', prenom: 'Developer', email: 'demo@gameforge.dev',
      password_hash: hash, role: 'developer', is_verified: 1,
    })
    const dev = await Developer.create({ user_id: user.id, api_key: 'demo_api_key_123', plan: 'pro' })
    const games = [
      { name: 'Nexus Runner',     slug: 'nexus-runner',     description: 'A 2D side-scrolling platformer. Jump over enemies, collect coins, survive endless levels!', category: 'Platformer', price: 0,    player_count: 0,    project_path: '/static/nexus-runner/index.html' },
      { name: 'Space Explorer',   slug: 'space-explorer',   description: 'Explore procedurally generated galaxies.', category: 'Adventure',  price: 0,    player_count: 842 },
      { name: 'Nexus Dungeon',    slug: 'nexus-dungeon',    description: 'Dark dungeon crawler with physics combat.', category: 'Action',     price: 4.99, player_count: 317 },
      { name: 'Terrain Quest',    slug: 'terrain-quest',    description: 'Explore vast procedural terrains.',          category: 'Sandbox',    price: 0,    player_count: 1204 },
      { name: 'Puzzle Cubes',     slug: 'puzzle-cubes',     description: 'Minimalist physics puzzle game.',           category: 'Puzzle',     price: 1.99, player_count: 593 },
      { name: 'Void Runner',      slug: 'void-runner',      description: 'Fast-paced neon platformer.',               category: 'Platformer', price: 0,    player_count: 726 },
      { name: 'Fortress Builder', slug: 'fortress-builder', description: 'Build and defend your fortress.',           category: 'Strategy',   price: 9.99, player_count: 158 },
    ]
    for (const g of games) {
      await Game.create({ ...g, developer_id: dev.id, status: 'published' })
    }
  }
}
