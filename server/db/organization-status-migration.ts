import { sql, type Kysely } from 'kysely'

export const organizationStatusMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`ALTER TABLE organization ADD COLUMN active boolean NOT NULL DEFAULT true`.execute(db)
    await sql`ALTER TABLE organization ADD COLUMN verified boolean NOT NULL DEFAULT false`.execute(
      db
    )
  }
}
