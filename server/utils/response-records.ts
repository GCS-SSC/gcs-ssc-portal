import { sql, type Selectable } from 'kysely'
import type { Database } from '../db/schema'
import { governmentFail as fail, type GovernmentDb } from './government-access'
import { initialResponseItems } from './response-validation'
export const responseRow = async (db: GovernmentDb, organizationId: number, id: number) =>
  (await db
    .selectFrom('set_response')
    .selectAll()
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .executeTakeFirst()) ?? fail(404, 'RESPONSE_NOT_FOUND')
/** Caller holds organization lock and has checked contributor access/publication. */
export const createResponseDraft = async (
  db: GovernmentDb,
  set: Selectable<Database['submission_set']>,
  userId: number,
  locale: 'en' | 'fr'
) => {
  const existing = await db
    .selectFrom('set_response')
    .select('id')
    .where('setId', '=', set.id)
    .where('status', '=', 'draft')
    .executeTakeFirst()
  if (existing) return existing.id
  if (!set.snapshot) return fail(409, 'SET_WITHDRAWN')
  const forecastYearIds = [
    ...new Set(
      set.snapshot.items.flatMap(({ item }) =>
        item.kind === 'forecast' ? [item.fiscalYearId] : []
      )
    )
  ]
  const forecastIterations: Record<string, number> = {}
  if (forecastYearIds.length && set.snapshot.agreementReference) {
    const previous = await db
      .selectFrom('set_response')
      .select(['snapshot', 'forecastIterations'])
      .where('organizationId', '=', set.organizationId)
      .execute()
    for (const fiscalYearId of forecastYearIds)
      forecastIterations[fiscalYearId] =
        1 +
        Math.max(
          0,
          ...previous
            .filter(
              (row) => row.snapshot.agreementReference?.id === set.snapshot!.agreementReference?.id
            )
            .map((row) => row.forecastIterations[fiscalYearId] ?? 0)
        )
  }
  const now = new Date()
  const created = await db
    .insertInto('set_response')
    .values({
      setId: set.id,
      organizationId: set.organizationId,
      setRevision: set.revision,
      snapshot: sql`${JSON.stringify(set.snapshot)}::jsonb`,
      items: sql`${JSON.stringify(initialResponseItems(set.snapshot, locale))}::jsonb`,
      forecastIterations: sql`${JSON.stringify(forecastIterations)}::jsonb`,
      locale,
      revision: 1,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
      submittedBy: null,
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      export: null
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  return created.id
}
