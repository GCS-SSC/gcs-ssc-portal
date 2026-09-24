import { createAdministrator } from '../server/utils/administrator-accounts'
import { useDatabase, closeDatabase } from '../server/utils/database'
try {
  await createAdministrator(await useDatabase(), {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  })
  console.log('Administrator account created. Sign in at /admin/login.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Administrator account creation failed')
  process.exitCode = 1
} finally {
  await closeDatabase()
}
