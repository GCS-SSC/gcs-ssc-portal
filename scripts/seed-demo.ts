import { requireDevelopmentSeed, seedDemo } from '../server/db/seed-migrations'
import { closeDatabase, useDatabase } from '../server/utils/database'

try {
  requireDevelopmentSeed()
  const applied = await seedDemo(await useDatabase())
  console.log(
    applied
      ? 'Demo data created. See README.md for accounts and walkthrough.'
      : 'Demo migration already applied; existing data and passwords were preserved.'
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Demo seed failed')
  process.exitCode = 1
} finally {
  await closeDatabase()
}
