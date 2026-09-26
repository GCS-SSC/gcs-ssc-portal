import { sql, type Kysely } from 'kysely'

export const administratorMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`CREATE TABLE administrator (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      "passwordHash" text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL
    )`.execute(db)
    await sql`CREATE TABLE administrator_session (
      "tokenHash" text PRIMARY KEY,
      "administratorId" integer NOT NULL REFERENCES administrator(id) ON DELETE CASCADE,
      "expiresAt" timestamptz NOT NULL,
      "createdAt" timestamptz NOT NULL
    )`.execute(db)
    await sql`CREATE INDEX administrator_session_owner ON administrator_session ("administratorId")`.execute(
      db
    )
    await sql`CREATE TABLE administrator_login_attempt (
      key text PRIMARY KEY,
      "windowStart" timestamptz NOT NULL,
      count integer NOT NULL
    )`.execute(db)
    // Old government sessions must not survive removal of the staff portal.
    await sql`DELETE FROM session WHERE "userId" IN (SELECT "userId" FROM government_user)`.execute(
      db
    )
    await sql`DELETE FROM account WHERE "userId" IN (SELECT "userId" FROM government_user)`.execute(
      db
    )
  }
}
