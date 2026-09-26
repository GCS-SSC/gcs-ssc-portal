import { sql, type Kysely } from 'kysely'

/** Verification is explicit and scoped to the agency's GCS recipient identity. */
export const organizationAgencyIdentityMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`
      CREATE TABLE organization_agency_identity (
        "agencyId" integer NOT NULL REFERENCES agency(id),
        "organizationId" integer NOT NULL REFERENCES organization(id),
        "foreignApplicantRecipientId" text NOT NULL CHECK ("foreignApplicantRecipientId" ~ '^[1-9][0-9]{0,18}$'),
        "verifiedAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("agencyId", "organizationId"),
        UNIQUE ("agencyId", "foreignApplicantRecipientId")
      )
    `.execute(db)
  }
}
