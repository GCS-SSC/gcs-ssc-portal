import { randomBytes } from 'node:crypto'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'
import { integrationTokenInput } from '../../shared/schemas/government'
import {
  requireGovernment,
  governmentFail as fail,
  secretHash,
  type GovernmentActor
} from './government-access'

export const listTokens = async (db: Kysely<Database>, actor: GovernmentActor) => {
  await requireGovernment(db, actor, { administrator: true })
  return db
    .selectFrom('integration_token')
    .select(['id', 'name', 'agencyId', 'expiresAt', 'revoked'])
    .orderBy('createdAt', 'desc')
    .execute()
}
export const createToken = async (db: Kysely<Database>, actor: GovernmentActor, input: unknown) => {
  const data = integrationTokenInput.parse(input),
    token = `gcs_${randomBytes(32).toString('base64url')}`
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { administrator: true, lock: true })
    if (
      !(await tx
        .selectFrom('agency')
        .select('id')
        .where('id', '=', data.agencyId)
        .executeTakeFirst())
    )
      fail(404, 'AGENCY_NOT_FOUND')
    const row = {
      name: data.name,
      agencyId: data.agencyId,
      tokenHash: secretHash(token),
      expiresAt:
        data.expiresInDays === null ? null : new Date(Date.now() + data.expiresInDays * 86400000),
      revoked: false,
      createdAt: new Date()
    }
    const created = await tx
      .insertInto('integration_token')
      .values(row)
      .returning('id')
      .executeTakeFirstOrThrow()
    return { id: created.id, token, expiresAt: row.expiresAt }
  })
}
export const revokeToken = async (db: Kysely<Database>, actor: GovernmentActor, id: number) =>
  db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { administrator: true, lock: true })
    const result = await tx
      .updateTable('integration_token')
      .set({ revoked: true })
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst()
    if (!result) fail(404, 'TOKEN_NOT_FOUND')
    return { success: true }
  })

export const replaceToken = async (db: Kysely<Database>, actor: GovernmentActor, id: number) => {
  const token = `gcs_${randomBytes(32).toString('base64url')}`
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { administrator: true, lock: true })
    const current = await tx
      .selectFrom('integration_token')
      .select(['revoked', 'expiresAt'])
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst()
    if (!current) return fail(404, 'TOKEN_NOT_FOUND')
    if (current.revoked || (current.expiresAt && current.expiresAt.getTime() <= Date.now()))
      return fail(409, 'TOKEN_NOT_ACTIVE')
    await tx
      .updateTable('integration_token')
      .set({ tokenHash: secretHash(token) })
      .where('id', '=', id)
      .execute()
    return { token }
  })
}
