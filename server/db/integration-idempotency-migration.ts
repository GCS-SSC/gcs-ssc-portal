import { sql, type Kysely } from 'kysely'

export const integrationIdempotencyMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`CREATE TABLE integration_request (
      "agencyId" integer NOT NULL REFERENCES agency(id),
      key text NOT NULL CHECK (key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'),
      "requestHash" text NOT NULL CHECK ("requestHash" ~ '^[a-f0-9]{64}$'),
      response jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("agencyId", key)
    )`.execute(db)
  }
}
