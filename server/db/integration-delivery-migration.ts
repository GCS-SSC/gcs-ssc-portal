import { sql, type Kysely } from 'kysely'

/** Events are immutable; acknowledging one never changes the submitted evidence. */
export const integrationDeliveryMigration = {
  up: async (db: Kysely<unknown>) => {
    await sql`
      CREATE TABLE integration_delivery (
        id bigserial PRIMARY KEY,
        "agencyId" integer NOT NULL REFERENCES agency(id),
        "responseId" integer NOT NULL REFERENCES set_response(id),
        kind text NOT NULL CHECK (kind IN ('submission_item', 'organization_detail')),
        "itemSubmissionId" text,
        "detailId" integer REFERENCES submission_detail(id),
        "createdAt" timestamptz NOT NULL,
        CHECK ((kind = 'submission_item' AND "itemSubmissionId" IS NOT NULL AND "detailId" IS NULL)
            OR (kind = 'organization_detail' AND "itemSubmissionId" IS NULL AND "detailId" IS NOT NULL))
      )
    `.execute(db)
    await sql`CREATE UNIQUE INDEX delivery_item_identity ON integration_delivery ("responseId", "itemSubmissionId") WHERE "itemSubmissionId" IS NOT NULL`.execute(db)
    await sql`CREATE UNIQUE INDEX delivery_detail_identity ON integration_delivery ("detailId") WHERE "detailId" IS NOT NULL`.execute(db)
    await sql`CREATE INDEX delivery_agency_cursor ON integration_delivery ("agencyId", id)`.execute(db)
    await sql`
      CREATE TABLE integration_consumption (
        "eventId" bigint PRIMARY KEY REFERENCES integration_delivery(id),
        "remoteReference" text,
        "consumedAt" timestamptz NOT NULL
      )
    `.execute(db)
    await sql`
      INSERT INTO integration_delivery ("agencyId", "responseId", kind, "itemSubmissionId", "createdAt")
      SELECT s."agencyId", r.id, 'submission_item', item.value->>'itemSubmissionId', r."submittedAt"
      FROM set_response r JOIN submission_set s ON s.id = r."setId"
      CROSS JOIN LATERAL jsonb_array_elements(r.export->'items') item(value)
      WHERE r.export IS NOT NULL
    `.execute(db)
    await sql`
      INSERT INTO integration_delivery ("agencyId", "responseId", kind, "detailId", "createdAt")
      SELECT s."agencyId", d."responseId", 'organization_detail', d.id, d."createdAt"
      FROM submission_detail d JOIN set_response r ON r.id = d."responseId"
      JOIN submission_set s ON s.id = r."setId"
      WHERE d."createdBy" IS NOT NULL
    `.execute(db)
  }
}
