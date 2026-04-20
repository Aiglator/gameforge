import { Sequelize } from 'sequelize'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
mkdirSync(__dirname, { recursive: true })

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: join(__dirname, 'marketplace.db'),
  logging: false,
})

export default sequelize
