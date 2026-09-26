import { z } from 'zod'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'
import { externalId } from '../../shared/schemas/external'
import { primaryResponseCode, publicCode } from '../../shared/utils/response-code'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor
} from './government-access'

const changesQuery = z.object({
  since: z.union([z.iso.date(), z.iso.datetime()]).optional(),
  after: externalId.optional()
}).strict()
const consumptionInput = z.object({ remoteReference: z.string().trim().min(1).max(200).nullable().default(null) }).strict()

/** The default feed contains unconsumed events. `since` also replays newer consumed events. */
export const listIntegrationUpdates = async (
  db: Kysely<Database>, actor: GovernmentActor, agencyId: number, query: unknown
) => {
  const input = changesQuery.parse(query)
  await requireGovernment(db, actor, { agencyId })
  const rows = await db.selectFrom('integration_delivery as delivery')
    .innerJoin('set_response as response', 'response.id', 'delivery.responseId')
    .leftJoin('integration_consumption as consumption', 'consumption.eventId', 'delivery.id')
    .select([
      'delivery.id', 'delivery.responseId', 'delivery.itemSubmissionId', 'delivery.detailId',
      'delivery.kind', 'delivery.createdAt', 'response.snapshot',
      'consumption.consumedAt', 'consumption.remoteReference'
    ])
    .where('delivery.agencyId', '=', agencyId)
    .$if(Boolean(input.after), (builder) => builder.where('delivery.id', '>', input.after!))
    .$if(Boolean(input.since), (builder) => builder.where((expression) => expression.or([
      expression('consumption.eventId', 'is', null),
      expression('delivery.createdAt', '>=', new Date(input.since!.length === 10
        ? `${input.since}T00:00:00.000Z` : input.since!))
    ])))
    .$if(!input.since, (builder) => builder.where('consumption.eventId', 'is', null))
    .orderBy('delivery.id')
    .limit(51)
    .execute()
  return {
    updates: rows.slice(0, 50).map((row) => ({
      eventId: String(row.id),
      kind: row.kind,
      submissionId: primaryResponseCode(row.responseId, row.snapshot.items.map((entry) => entry.item.kind)),
      itemSubmissionId: row.itemSubmissionId,
      detailId: row.detailId === null ? null : publicCode(row.detailId, 'H'),
      createdAt: new Date(row.createdAt).toISOString(),
      consumedAt: row.consumedAt ? new Date(row.consumedAt).toISOString() : null,
      remoteReference: row.remoteReference
    })),
    nextCursor: rows.length > 50 ? String(rows[49]!.id) : null
  }
}

export const consumeIntegrationUpdate = async (
  db: Kysely<Database>, actor: GovernmentActor, agencyId: number, eventId: string, body: unknown
) => {
  const parsedId = externalId.parse(eventId)
  const input = consumptionInput.parse(body)
  return db.transaction().execute(async (transaction) => {
    await requireGovernment(transaction, actor, { agencyId, lock: true })
    const event = await transaction.selectFrom('integration_delivery').select('id')
      .where('id', '=', parsedId).where('agencyId', '=', agencyId).forUpdate().executeTakeFirst()
    if (!event) return fail(404, 'UPDATE_NOT_FOUND')
    const existing = await transaction.selectFrom('integration_consumption').selectAll()
      .where('eventId', '=', parsedId).executeTakeFirst()
    if (existing) {
      if (existing.remoteReference !== input.remoteReference) return fail(409, 'UPDATE_ALREADY_CONSUMED')
      return { eventId: parsedId, remoteReference: existing.remoteReference, consumedAt: new Date(existing.consumedAt).toISOString() }
    }
    const consumedAt = new Date()
    await transaction.insertInto('integration_consumption').values({
      eventId: parsedId, remoteReference: input.remoteReference, consumedAt
    }).execute()
    return { eventId: parsedId, remoteReference: input.remoteReference, consumedAt: consumedAt.toISOString() }
  })
}
