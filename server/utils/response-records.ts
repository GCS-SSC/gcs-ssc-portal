import { sql, type Selectable } from 'kysely'
import { v7 as uuid } from 'uuid'
import type { Database } from '../db/schema'
import { governmentFail as fail, type GovernmentDb } from './government-access'
import { initialResponseItems } from './response-validation'
export const responseRow = async (db: GovernmentDb, organizationId: string, id: string) =>
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
  userId: string,
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
  const id = uuid(),
    now = new Date()
  await db
    .insertInto('set_response')
    .values({
      id,
      setId: set.id,
      organizationId: set.organizationId,
      setRevision: set.revision,
      snapshot: sql`${JSON.stringify(set.snapshot)}::jsonb`,
      items: sql`${JSON.stringify(initialResponseItems(set.snapshot, locale))}::jsonb`,
      locale,
      revision: 1,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
      submittedBy: null,
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      submissionId: null,
      export: null
    })
    .execute()
  return id
}
