import { createHash } from 'node:crypto'
import { createError } from 'h3'
import type { Kysely, Transaction } from 'kysely'
import type { Database } from '../db/schema'
import type { GovernmentAccess } from '../../shared/types/government'
export type GovernmentDb = Kysely<Database> | Transaction<Database>
export type GovernmentActor =
  { kind: 'user'; userId: string } | { kind: 'integration'; tokenHash: string }
export const governmentFail = (statusCode: number, code: string): never => {
  throw createError({ statusCode, message: code, data: { code } })
}
export const secretHash = (value: string) => createHash('sha256').update(value).digest('hex')
export const governmentAccess = async (
  db: GovernmentDb,
  userId: string
): Promise<GovernmentAccess | null> => {
  const staff = await db
    .selectFrom('government_user')
    .selectAll()
    .where('userId', '=', userId)
    .where('active', '=', true)
    .executeTakeFirst()
  if (!staff) return null
  const agencies = await db
    .selectFrom('agency_staff')
    .select('agencyId')
    .where('userId', '=', userId)
    .execute()
  return { role: staff.role, agencyIds: agencies.map((agency) => agency.agencyId) }
}
export const isGovernmentAccount = async (db: GovernmentDb, userId: string): Promise<boolean> =>
  Boolean(
    await db
      .selectFrom('government_user')
      .select('userId')
      .where('userId', '=', userId)
      .executeTakeFirst()
  )

export const requireOrganizationAccount = async (db: GovernmentDb, userId: string) => {
  if (await isGovernmentAccount(db, userId)) governmentFail(403, 'ORGANIZATION_ACCESS_FORBIDDEN')
}
/** Resolve current authority in the transaction; callers cannot supply cached grants. */
export const requireGovernment = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  options: { agencyId?: string; root?: boolean; lock?: boolean } = {}
) => {
  if (actor.kind === 'integration') {
    if (options.root) return governmentFail(403, 'ROOT_REQUIRED')
    let query = db
      .selectFrom('integration_token')
      .selectAll()
      .where('tokenHash', '=', actor.tokenHash)
    if (options.lock) query = query.forUpdate()
    const token = await query.executeTakeFirst()
    if (!token || token.revoked || new Date(token.expiresAt).getTime() <= Date.now())
      return governmentFail(401, 'INVALID_INTEGRATION_TOKEN')
    if (options.agencyId && token.agencyId !== options.agencyId)
      return governmentFail(404, 'AGENCY_NOT_FOUND')
    return { role: 'integration' as const, agencyIds: [token.agencyId] }
  }
  let query = db.selectFrom('government_user').selectAll().where('userId', '=', actor.userId)
  if (options.lock) query = query.forUpdate()
  const staff = await query.executeTakeFirst()
  if (!staff?.active) return governmentFail(403, 'GOVERNMENT_ACCESS_REQUIRED')
  if (options.root && staff.role !== 'root') return governmentFail(403, 'ROOT_REQUIRED')
  const agencies = await db
    .selectFrom('agency_staff')
    .select('agencyId')
    .where('userId', '=', actor.userId)
    .execute()
  const agencyIds = agencies.map((agency) => agency.agencyId)
  if (options.agencyId && staff.role !== 'root' && !agencyIds.includes(options.agencyId))
    return governmentFail(404, 'AGENCY_NOT_FOUND')
  return { role: staff.role, agencyIds }
}
