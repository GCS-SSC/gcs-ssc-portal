import { sql, type Kysely } from 'kysely'

/** Keep existing agreement and submission identifiers while allowing several recipients. */
export const agreementOrganizationsMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`ALTER TABLE funding_agreement ADD CONSTRAINT funding_agreement_id_agency UNIQUE (id, "agencyId")`.execute(db)
    await sql`
      CREATE TABLE agreement_organization (
        "agreementId" integer NOT NULL,
        "organizationId" integer NOT NULL REFERENCES organization(id),
        "agencyId" integer NOT NULL,
        "foreignApplicantRecipientId" text,
        PRIMARY KEY ("agreementId", "organizationId"),
        UNIQUE ("agreementId", "organizationId", "agencyId"),
        FOREIGN KEY ("agreementId", "agencyId") REFERENCES funding_agreement(id, "agencyId"),
        CHECK ("foreignApplicantRecipientId" IS NULL OR "foreignApplicantRecipientId" ~ '^[1-9][0-9]{0,18}$')
      )
    `.execute(db)
    await sql`
      INSERT INTO agreement_organization ("agreementId", "organizationId", "agencyId", "foreignApplicantRecipientId")
      SELECT id, "organizationId", "agencyId", config->>'externalApplicantRecipientId'
      FROM funding_agreement
    `.execute(db)
    await sql`CREATE INDEX agreement_organization_organization ON agreement_organization ("organizationId", "agreementId")`.execute(db)
    await sql`ALTER TABLE submission_set DROP CONSTRAINT "submission_set_agreementId_organizationId_agencyId_fkey"`.execute(db)
    await sql`
      ALTER TABLE submission_set ADD CONSTRAINT submission_set_agreement_organization
      FOREIGN KEY ("agreementId", "organizationId", "agencyId")
      REFERENCES agreement_organization ("agreementId", "organizationId", "agencyId")
    `.execute(db)
  }
}
