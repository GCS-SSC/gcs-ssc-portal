import { Migrator, type Kysely } from 'kysely'
import type { Database } from './schema'
import { demoMigration } from './seeds/001-demo'
import { simpleCredentialsMigration } from './seeds/002-simple-credentials'
import { administratorSeed } from './seeds/003-administrator'
import { demoAgreementsMigration } from './seeds/004-demo-agreements'
import { demoFundingCallsMigration } from './seeds/005-demo-funding-calls'
import { demoSecondAgencyMigration } from './seeds/006-demo-second-agency'
import { demoOrganizationsMigration } from './seeds/007-demo-organizations'
import { reportMigrationResults } from './migrations'

export const requireSeedEnvironment = () => {
  if (process.env.NODE_ENV === 'production' && process.env.PORTAL_ENVIRONMENT !== 'demo')
    throw new Error(
      'Demo seed is disabled in production mode. Use a development database or an explicit demo image.'
    )
}

export const seedDemo = async (db: Kysely<Database>) => {
  requireSeedEnvironment()
  const migrator = new Migrator({
    db,
    migrationTableName: 'portal_demo_migration',
    migrationLockTableName: 'portal_demo_migration_lock',
    provider: {
      getMigrations: async () => ({
        '001_demo': demoMigration,
        '002_simple_credentials': simpleCredentialsMigration,
        '003_administrator': administratorSeed,
        '004_demo_agreements': demoAgreementsMigration,
        '005_demo_funding_calls': demoFundingCallsMigration,
        '006_demo_second_agency': demoSecondAgencyMigration,
        '007_demo_organizations': demoOrganizationsMigration
      })
    }
  })
  const result = await migrator.migrateToLatest()
  reportMigrationResults(result.results, 'demo migration')
  if (result.error) throw result.error
  return result.results?.some((entry) => entry.status === 'Success') ?? false
}
