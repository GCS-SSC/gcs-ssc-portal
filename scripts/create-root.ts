import { bootstrapRoot } from '../server/utils/government-admin'
import { useDatabase, closeDatabase } from '../server/utils/database'
try {
  await bootstrapRoot(await useDatabase(), {
    name: process.env.ROOT_NAME,
    email: process.env.ROOT_EMAIL,
    password: process.env.ROOT_PASSWORD
  })
  console.log('Government root account created. Sign in at /government/login.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Root account creation failed')
  process.exitCode = 1
} finally {
  await closeDatabase()
}
