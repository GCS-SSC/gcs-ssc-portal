import { sql, type Kysely } from 'kysely'
export const governmentMigration = {
  up: async (db: Kysely<unknown>) => {
    const statements = `
ALTER TABLE permission DROP CONSTRAINT permission_permission_check;
ALTER TABLE permission ADD CONSTRAINT permission_permission_check CHECK (permission IN ('admin', 'application'));
CREATE TABLE government_user ("userId" text PRIMARY KEY REFERENCES "user"(id), role text NOT NULL CHECK (role IN ('root','staff')), active boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL);
CREATE UNIQUE INDEX government_single_root ON government_user (role) WHERE role = 'root';
CREATE TABLE agency (id uuid PRIMARY KEY, "nameEn" text NOT NULL CHECK (length("nameEn") BETWEEN 1 AND 200), "nameFr" text NOT NULL CHECK (length("nameFr") BETWEEN 1 AND 200), "createdAt" timestamptz NOT NULL);
CREATE TABLE agency_staff ("agencyId" uuid NOT NULL REFERENCES agency(id), "userId" text NOT NULL REFERENCES government_user("userId"), PRIMARY KEY ("agencyId", "userId"));
CREATE INDEX agency_staff_user ON agency_staff ("userId");
CREATE TABLE program (id uuid PRIMARY KEY, "agencyId" uuid NOT NULL REFERENCES agency(id), "nameEn" text NOT NULL CHECK (length("nameEn") BETWEEN 1 AND 200), "nameFr" text NOT NULL CHECK (length("nameFr") BETWEEN 1 AND 200), "createdAt" timestamptz NOT NULL);
CREATE INDEX program_agency ON program ("agencyId");
CREATE TABLE stream (id uuid PRIMARY KEY, "programId" uuid NOT NULL REFERENCES program(id), "nameEn" text NOT NULL CHECK (length("nameEn") BETWEEN 1 AND 200), "nameFr" text NOT NULL CHECK (length("nameFr") BETWEEN 1 AND 200), "createdAt" timestamptz NOT NULL);
CREATE INDEX stream_program ON stream ("programId");
CREATE TABLE funding_call (id uuid PRIMARY KEY, "streamId" uuid NOT NULL REFERENCES stream(id), "nameEn" text NOT NULL CHECK (length("nameEn") BETWEEN 1 AND 200), "nameFr" text NOT NULL CHECK (length("nameFr") BETWEEN 1 AND 200), "startDate" date NOT NULL, "endDate" date NOT NULL CHECK ("endDate" >= "startDate"), published boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL);
CREATE INDEX funding_call_stream ON funding_call ("streamId");
CREATE TABLE government_invitation (id uuid PRIMARY KEY, email text NOT NULL, name text NOT NULL, "agencyId" uuid REFERENCES agency(id), "tokenHash" text NOT NULL UNIQUE, status text NOT NULL CHECK (status IN ('pending','accepted','revoked')), "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL);
CREATE TABLE integration_token (id uuid PRIMARY KEY, name text NOT NULL, "agencyId" uuid NOT NULL REFERENCES agency(id), "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL);
`
    for (const statement of statements
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean))
      await sql.raw(statement).execute(db)
  }
}
