import { sql, type Kysely } from 'kysely'
export const surveyMigration = {
  up: async (db: Kysely<unknown>) => {
    for (const statement of [
      `CREATE TABLE survey (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "agencyId" integer NOT NULL REFERENCES agency(id), revision integer NOT NULL CHECK (revision > 0), "updatedAt" timestamptz NOT NULL)`,
      `CREATE INDEX survey_agency ON survey ("agencyId")`,
      `CREATE TABLE survey_revision ("surveyId" integer NOT NULL REFERENCES survey(id), revision integer NOT NULL CHECK (revision > 0), definition jsonb NOT NULL, "createdAt" timestamptz NOT NULL, PRIMARY KEY ("surveyId", revision))`,
      `ALTER TABLE funding_call ADD COLUMN "surveyId" integer, ADD COLUMN "surveyRevision" integer, ADD CONSTRAINT call_survey_pair CHECK (("surveyId" IS NULL) = ("surveyRevision" IS NULL)), ADD CONSTRAINT call_survey_version FOREIGN KEY ("surveyId", "surveyRevision") REFERENCES survey_revision("surveyId", revision)`
    ])
      await sql.raw(statement).execute(db)
  }
}
