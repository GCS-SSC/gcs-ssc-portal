import { createHash } from 'node:crypto'
import { sql, type Kysely, type Transaction } from 'kysely'
import type { Database } from '../db/schema'
import { governmentFail as fail, requireGovernment, type GovernmentActor } from './government-access'
import { publicReferences } from './public-identifiers'

export const executeIdempotentGovernmentMutation = async (
  db: Kysely<Database>, actor: GovernmentActor,
  request: { key: string; method: string; path: string[]; query: string; body?: Uint8Array },
  operation: (transaction: Transaction<Database>) => Promise<unknown>
) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(request.key))
    return fail(400, 'INVALID_IDEMPOTENCY_KEY')
  const requestHash = createHash('sha256')
    .update(JSON.stringify([request.method, request.path, request.query]))
    .update('\0').update(request.body ?? new Uint8Array()).digest('hex')
  return db.transaction().execute(async (transaction) => {
    const authority = await requireGovernment(transaction, actor, { lock: true })
    const agencyId = authority.agencyIds[0]
    if (!agencyId) return fail(403, 'INTEGRATION_TOKEN_REQUIRED')
    const inserted = await transaction.insertInto('integration_request')
      .values({ agencyId, key: request.key, requestHash, response: null })
      .onConflict(conflict => conflict.columns(['agencyId', 'key']).doNothing())
      .returning('key').executeTakeFirst()
    if (!inserted) {
      const saved = await transaction.selectFrom('integration_request').select(['requestHash', 'response'])
        .where('agencyId', '=', agencyId).where('key', '=', request.key)
        .forUpdate().executeTakeFirstOrThrow()
      if (saved.requestHash !== requestHash) return fail(409, 'IDEMPOTENCY_KEY_CONFLICT')
      if (!saved.response) return fail(500, 'INCOMPLETE_INTEGRATION_REQUEST')
      return saved.response
    }
    const response = JSON.parse(JSON.stringify(publicReferences(await operation(transaction)))) as Record<string, unknown>
    await transaction.updateTable('integration_request')
      .set({ response: sql`${JSON.stringify(response)}::jsonb` })
      .where('agencyId', '=', agencyId).where('key', '=', request.key).execute()
    return response
  })
}
