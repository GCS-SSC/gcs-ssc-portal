import { defineNitroPlugin } from 'nitropack/runtime'
import { closeDatabase, useDatabase } from '../utils/database'
export default defineNitroPlugin(async (nitroApp) => {
  await useDatabase()
  nitroApp.hooks.hook('close', closeDatabase)
})
