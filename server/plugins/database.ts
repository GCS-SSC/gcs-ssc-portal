import { defineNitroPlugin } from 'nitropack/runtime'
import { closeDatabase, useDatabase } from '../utils/database'
import { seedDemo } from '../db/seed-migrations'
export default defineNitroPlugin(async (nitroApp) => {
  const database = await useDatabase()
  if (process.env.PORTAL_AUTO_SEED === 'true') await seedDemo(database)
  nitroApp.hooks.hook('close', closeDatabase)
})
