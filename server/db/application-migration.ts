import { sql, type Kysely } from 'kysely'
export const applicationMigration = {
  up: async (db: Kysely<unknown>) => {
    const statements = `
ALTER TABLE funding_call ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);
ALTER TABLE funding_call ADD COLUMN "agencyId" integer;
UPDATE funding_call SET "agencyId" = stream."agencyId" FROM stream WHERE stream.id = funding_call."streamId";
ALTER TABLE funding_call ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE funding_call ADD CONSTRAINT call_stream_agency FOREIGN KEY ("streamId", "agencyId") REFERENCES stream(id, "agencyId");
ALTER TABLE funding_call ADD CONSTRAINT call_agency_identity UNIQUE (id, "agencyId");
ALTER TABLE submission_set ADD COLUMN "callId" integer;
ALTER TABLE submission_set ADD CONSTRAINT set_call_agency FOREIGN KEY ("callId", "agencyId") REFERENCES funding_call(id, "agencyId");
ALTER TABLE submission_set ADD CONSTRAINT set_application_scope CHECK ("callId" IS NULL OR "agreementId" IS NULL);
CREATE UNIQUE INDEX application_organization_call ON submission_set ("organizationId", "callId");
CREATE TABLE response_attachment (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "responseId" integer REFERENCES set_response(id) ON DELETE SET NULL,
 "itemId" text NOT NULL, filename text NOT NULL, size integer NOT NULL CHECK (size > 0 AND size <= 26214400),
 sha256 text NOT NULL CHECK (length(sha256) = 64), bucket text NOT NULL, "objectKey" text NOT NULL UNIQUE,
 status text NOT NULL CHECK (status IN ('pending','ready')),
 "createdBy" integer NOT NULL REFERENCES "user"(id), "createdAt" timestamptz NOT NULL
);
CREATE INDEX attachment_response ON response_attachment ("responseId");
`
    for (const statement of statements
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean))
      await sql.raw(statement).execute(db)
  }
}
