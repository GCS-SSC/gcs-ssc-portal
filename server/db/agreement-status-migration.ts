import { sql, type Kysely } from 'kysely'

export const agreementStatusMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`ALTER TABLE funding_agreement ADD COLUMN active boolean NOT NULL DEFAULT true`.execute(
      db
    )
    await sql`ALTER TABLE funding_agreement ADD COLUMN status jsonb`.execute(db)
  }
}
