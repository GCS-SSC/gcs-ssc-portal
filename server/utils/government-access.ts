import { createHash } from 'node:crypto'
import { createError } from 'h3'
import type { Kysely, Transaction } from 'kysely'
import type { Database } from '../db/schema'
export type GovernmentDb = Kysely<Database> | Transaction<Database>
export type GovernmentActor =
  { kind: 'administrator'; administratorId: number } | { kind: 'integration'; tokenHash: string }
export const governmentFail = (statusCode: number, code: string): never => {
  throw createError({ statusCode, message: code, data: { code } })
}
export const secretHash = (value: string) => createHash('sha256').update(value).digest('hex')
export const isGovernmentAccount = async (db: GovernmentDb, userId: number): Promise<boolean> =>
  Boolean(
    await db
      .selectFrom('government_user')
      .select('userId')
      .where('userId', '=', userId)
      .executeTakeFirst()
  )

export const requireOrganizationAccount = async (db: GovernmentDb, userId: number) => {
  if (await isGovernmentAccount(db, userId)) governmentFail(403, 'ORGANIZATION_ACCESS_FORBIDDEN')
}
/** Resolve current authority in the transaction; callers cannot supply cached grants. */
export const requireGovernment = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  options: { agencyId?: number; administrator?: boolean; lock?: boolean } = {}
) => {
  if (actor.kind === 'integration') {
    if (options.administrator) return governmentFail(403, 'ADMINISTRATOR_REQUIRED')
    let query = db
      .selectFrom('integration_token')
      .selectAll()
      .where('tokenHash', '=', actor.tokenHash)
    if (options.lock) query = query.forUpdate()
    const token = await query.executeTakeFirst()
    if (!token || token.revoked || (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()))
      return governmentFail(401, 'INVALID_INTEGRATION_TOKEN')
    if (options.agencyId && token.agencyId !== options.agencyId)
      return governmentFail(404, 'AGENCY_NOT_FOUND')
    return { role: 'integration' as const, agencyIds: [token.agencyId], tokenId: token.id }
  }
  let query = db.selectFrom('administrator').selectAll().where('id', '=', actor.administratorId)
  if (options.lock) query = query.forUpdate()
  const administrator = await query.executeTakeFirst()
  if (!administrator?.active) return governmentFail(403, 'ADMINISTRATOR_REQUIRED')
  return { role: 'administrator' as const, agencyIds: [] }
}
