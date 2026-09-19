import { Migrator, type Kysely } from 'kysely'
import type { Database } from './schema'
import { demoMigration } from './seeds/001-demo'

export const requireDevelopmentSeed = () => {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seed is disabled in production. Use a development database.')
}

export const seedDemo = async (db: Kysely<Database>) => {
  requireDevelopmentSeed()
  const migrator = new Migrator({
    db,
    migrationTableName: 'portal_demo_migration',
    migrationLockTableName: 'portal_demo_migration_lock',
    provider: { getMigrations: async () => ({ '001_demo': demoMigration }) }
  })
  const result = await migrator.migrateToLatest()
  if (result.error) throw result.error
  return result.results?.some((entry) => entry.status === 'Success') ?? false
}
