import { sql, type Kysely } from 'kysely'

export const submissionItemOutcomesMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`
      CREATE TABLE submission_item_outcome (
        "responseId" integer NOT NULL REFERENCES set_response(id),
        "itemSubmissionId" text NOT NULL,
        "remoteReference" text,
        "gcsStatus" jsonb,
        revision integer NOT NULL CHECK (revision > 0),
        "updatedAt" timestamptz NOT NULL,
        PRIMARY KEY ("responseId", "itemSubmissionId")
      )
    `.execute(db)
  }
}
