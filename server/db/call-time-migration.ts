import { sql, type Kysely } from 'kysely'

export const callTimeMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`ALTER TABLE funding_call ADD COLUMN "startTime" time NOT NULL DEFAULT '00:00:00'`.execute(
      db
    )
    await sql`ALTER TABLE funding_call ADD COLUMN "endTime" time NOT NULL DEFAULT '23:59:59.999999'`.execute(
      db
    )
    await sql`ALTER TABLE funding_call ADD CONSTRAINT call_time_order CHECK (("endDate" + "endTime") > ("startDate" + "startTime"))`.execute(
      db
    )
  }
}
