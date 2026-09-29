import { sql, type Kysely } from 'kysely'

/** Ordered, revision-pinned forms belonging to a funding call. */
export const callFormsMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`CREATE TABLE funding_call_form (
      "callId" integer NOT NULL REFERENCES funding_call(id) ON DELETE CASCADE,
      position integer NOT NULL CHECK (position >= 0),
      "surveyId" integer NOT NULL,
      "surveyRevision" integer NOT NULL,
      PRIMARY KEY ("callId", position),
      UNIQUE ("callId", "surveyId"),
      FOREIGN KEY ("surveyId", "surveyRevision") REFERENCES survey_revision("surveyId", revision)
    )`.execute(db)
    await sql`INSERT INTO funding_call_form ("callId", position, "surveyId", "surveyRevision")
      SELECT id, 0, "surveyId", "surveyRevision" FROM funding_call WHERE "surveyId" IS NOT NULL`.execute(db)
  }
}
