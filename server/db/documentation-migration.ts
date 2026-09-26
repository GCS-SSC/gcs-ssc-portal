import { sql, type Kysely } from 'kysely'

export const documentationMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`ALTER TABLE submission_detail ALTER COLUMN "createdBy" DROP NOT NULL`.execute(db)
    await sql`ALTER TABLE submission_detail ADD COLUMN "senderAgencyId" integer REFERENCES agency(id)`.execute(
      db
    )
    await sql`ALTER TABLE submission_detail ADD CONSTRAINT submission_detail_sender CHECK (("createdBy" IS NULL) <> ("senderAgencyId" IS NULL))`.execute(
      db
    )
    await sql`ALTER TABLE response_attachment ALTER COLUMN "createdBy" DROP NOT NULL`.execute(db)
    await sql`ALTER TABLE response_attachment ADD COLUMN "senderAgencyId" integer REFERENCES agency(id)`.execute(
      db
    )
    await sql`ALTER TABLE response_attachment ADD CONSTRAINT response_attachment_sender CHECK (("createdBy" IS NULL) <> ("senderAgencyId" IS NULL))`.execute(
      db
    )
  }
}
