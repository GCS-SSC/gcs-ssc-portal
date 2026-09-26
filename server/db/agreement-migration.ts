import { sql, type Kysely } from 'kysely'
export const agreementMigration = {
  up: async (db: Kysely<unknown>) => {
    const statements = `
ALTER TABLE agency ADD COLUMN "sourceSystem" text NOT NULL DEFAULT 'gcs-ssc';
ALTER TABLE agency ADD COLUMN "foreignSystemId" text;
CREATE UNIQUE INDEX agency_foreign_identity ON agency ("sourceSystem", "foreignSystemId");
ALTER TABLE program ADD COLUMN "sourceSystem" text NOT NULL DEFAULT 'gcs-ssc';
ALTER TABLE program ADD COLUMN "foreignSystemId" text;
CREATE UNIQUE INDEX program_foreign_identity ON program ("agencyId", "sourceSystem", "foreignSystemId");
ALTER TABLE stream ADD COLUMN "sourceSystem" text NOT NULL DEFAULT 'gcs-ssc';
ALTER TABLE stream ADD COLUMN "foreignSystemId" text;
CREATE UNIQUE INDEX stream_foreign_identity ON stream ("programId", "sourceSystem", "foreignSystemId");
ALTER TABLE funding_call ADD COLUMN "sourceSystem" text NOT NULL DEFAULT 'gcs-ssc';
ALTER TABLE funding_call ADD COLUMN "foreignSystemId" text;
CREATE UNIQUE INDEX funding_call_foreign_identity ON funding_call ("streamId", "sourceSystem", "foreignSystemId");
ALTER TABLE permission DROP CONSTRAINT permission_permission_check;
UPDATE permission SET permission = 'application:viewer' WHERE permission = 'application';
ALTER TABLE permission ADD CONSTRAINT permission_permission_check CHECK (permission = 'admin' OR permission ~ '^(application|claim|forecast|form):(viewer|contributor|manager)$');
CREATE UNIQUE INDEX permission_subject_unique ON permission ("organizationId", "userId", split_part(permission, ':', 1));
ALTER TABLE program ADD CONSTRAINT program_agency_identity UNIQUE (id, "agencyId");
ALTER TABLE stream ADD COLUMN "agencyId" integer;
UPDATE stream SET "agencyId" = program."agencyId" FROM program WHERE program.id = stream."programId";
ALTER TABLE stream ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE stream ADD CONSTRAINT stream_program_agency FOREIGN KEY ("programId", "agencyId") REFERENCES program(id, "agencyId");
ALTER TABLE stream ADD CONSTRAINT stream_agency_identity UNIQUE (id, "agencyId");
CREATE TABLE funding_agreement (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "organizationId" integer NOT NULL REFERENCES organization(id), "agencyId" integer NOT NULL REFERENCES agency(id), "streamId" integer NOT NULL REFERENCES stream(id),
 "nameEn" text NOT NULL, "nameFr" text NOT NULL, "agreementNumber" text NOT NULL, config jsonb NOT NULL,
 "sourceSystem" text NOT NULL, "foreignSystemId" text, revision integer NOT NULL CHECK (revision > 0), "createdAt" timestamptz NOT NULL,
 FOREIGN KEY ("streamId", "agencyId") REFERENCES stream(id, "agencyId"), UNIQUE (id, "organizationId", "agencyId"), UNIQUE ("agencyId", "sourceSystem", "foreignSystemId")
);
CREATE INDEX funding_agreement_organization ON funding_agreement ("organizationId");
CREATE TABLE submission_set (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "organizationId" integer NOT NULL REFERENCES organization(id), "agencyId" integer NOT NULL REFERENCES agency(id), "agreementId" integer,
 "nameEn" text NOT NULL, "nameFr" text NOT NULL, "sourceSystem" text NOT NULL, "foreignSystemId" text,
 items jsonb NOT NULL, snapshot jsonb, revision integer NOT NULL CHECK (revision > 0), published boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL,
 FOREIGN KEY ("agreementId", "organizationId", "agencyId") REFERENCES funding_agreement(id, "organizationId", "agencyId"),
 CHECK (NOT published OR snapshot IS NOT NULL), UNIQUE (id, "organizationId"), UNIQUE ("agencyId", "sourceSystem", "foreignSystemId")
);
CREATE INDEX submission_set_organization ON submission_set ("organizationId");
CREATE TABLE set_response (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "setId" integer NOT NULL, "organizationId" integer NOT NULL,
 "setRevision" integer NOT NULL, snapshot jsonb NOT NULL, items jsonb NOT NULL, "forecastIterations" jsonb NOT NULL DEFAULT '{}'::jsonb,
 locale text NOT NULL CHECK (locale IN ('en','fr')), revision integer NOT NULL CHECK (revision > 0), status text NOT NULL CHECK (status IN ('draft','submitted','awaiting_documentation')), "gcsStatus" jsonb,
 "createdBy" integer NOT NULL REFERENCES "user"(id), "updatedBy" integer NOT NULL REFERENCES "user"(id), "submittedBy" integer REFERENCES "user"(id),
 "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, "submittedAt" timestamptz, export jsonb,
 FOREIGN KEY ("setId", "organizationId") REFERENCES submission_set(id, "organizationId"),
 CHECK ((status = 'draft' AND "submittedAt" IS NULL AND export IS NULL AND "submittedBy" IS NULL) OR (status IN ('submitted','awaiting_documentation') AND "submittedAt" IS NOT NULL AND export IS NOT NULL AND "submittedBy" IS NOT NULL))
);
CREATE UNIQUE INDEX set_response_one_draft ON set_response ("setId") WHERE status = 'draft';
CREATE INDEX set_response_organization ON set_response ("organizationId");
CREATE TABLE submission_detail (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "responseId" integer NOT NULL REFERENCES set_response(id), body text NOT NULL CHECK (length(body) <= 4000),
 "attachmentIds" jsonb NOT NULL DEFAULT '[]'::jsonb, "createdBy" integer NOT NULL REFERENCES "user"(id), "createdAt" timestamptz NOT NULL,
 CHECK (length(trim(body)) > 0 OR jsonb_array_length("attachmentIds") > 0)
);
CREATE INDEX submission_detail_response ON submission_detail ("responseId", "createdAt");
`
    for (const statement of statements
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean))
      await sql.raw(statement).execute(db)
  }
}
