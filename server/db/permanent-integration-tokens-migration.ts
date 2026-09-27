import { sql, type Kysely } from 'kysely'

export const permanentIntegrationTokensMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`ALTER TABLE integration_token ALTER COLUMN "expiresAt" DROP NOT NULL`.execute(db)
  }
}
