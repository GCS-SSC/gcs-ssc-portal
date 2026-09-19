import { randomBytes } from 'node:crypto'
import { v7 as uuid } from 'uuid'
import { hashPassword } from 'better-auth/crypto'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'
import {
  bootstrapInput,
  staffInvitationInput,
  staffAgencyInput,
  staffStatusInput,
  integrationTokenInput
} from '../../shared/schemas/government'
import {
  requireGovernment,
  governmentFail as fail,
  secretHash,
  type GovernmentActor
} from './government-access'
import { portalConfig } from './config'

export const bootstrapRoot = async (db: Kysely<Database>, input: unknown) => {
  const data = bootstrapInput.parse(input)
  const password = await hashPassword(data.password)
  return db.transaction().execute(async (tx) => {
    if (
      await tx
        .selectFrom('government_user')
        .select('userId')
        .where('role', '=', 'root')
        .executeTakeFirst()
    )
      fail(409, 'ROOT_ALREADY_EXISTS')
    if (await tx.selectFrom('user').select('id').where('email', '=', data.email).executeTakeFirst())
      fail(409, 'EMAIL_ALREADY_EXISTS')
    const id = uuid(),
      now = new Date()
    await tx
      .insertInto('user')
      .values({
        id,
        email: data.email,
        name: data.name,
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now
      })
      .execute()
    await tx
      .insertInto('account')
      .values({
        id: uuid(),
        userId: id,
        accountId: id,
        providerId: 'credential',
        password,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: now,
        updatedAt: now
      })
      .execute()
    await tx
      .insertInto('government_user')
      .values({ userId: id, role: 'root', active: true, createdAt: now })
      .execute()
    return { id }
  })
}
export const listStaff = async (db: Kysely<Database>, actor: GovernmentActor) => {
  await requireGovernment(db, actor, { root: true })
  const staff = await db
    .selectFrom('government_user as g')
    .innerJoin('user as u', 'u.id', 'g.userId')
    .select(['g.userId', 'g.role', 'g.active', 'u.name', 'u.email'])
    .orderBy('u.name')
    .execute()
  const grants = await db.selectFrom('agency_staff').selectAll().execute()
  return staff.map((person) => ({
    ...person,
    agencyIds: grants.filter((g) => g.userId === person.userId).map((g) => g.agencyId)
  }))
}
export const changeStaff = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  userId: string,
  input: unknown,
  action: 'access' | 'status'
) =>
  db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { root: true, lock: true })
    const target = await tx
      .selectFrom('government_user')
      .selectAll()
      .where('userId', '=', userId)
      .forUpdate()
      .executeTakeFirst()
    if (!target || target.role === 'root') fail(403, 'STAFF_ACCOUNT_REQUIRED')
    if (action === 'status') {
      const data = staffStatusInput.parse(input)
      await tx.updateTable('government_user').set(data).where('userId', '=', userId).execute()
      if (!data.active) await tx.deleteFrom('session').where('userId', '=', userId).execute()
    } else {
      const { agencyIds } = staffAgencyInput.parse(input)
      if (agencyIds.length) {
        const agencies = await tx
          .selectFrom('agency')
          .select('id')
          .where('id', 'in', agencyIds)
          .execute()
        if (agencies.length !== agencyIds.length) fail(404, 'AGENCY_NOT_FOUND')
      }
      await tx.deleteFrom('agency_staff').where('userId', '=', userId).execute()
      if (agencyIds.length)
        await tx
          .insertInto('agency_staff')
          .values(agencyIds.map((agencyId) => ({ agencyId, userId })))
          .execute()
    }
    return { success: true }
  })
export const listStaffInvitations = async (db: Kysely<Database>, actor: GovernmentActor) => {
  await requireGovernment(db, actor, { root: true })
  const rows = await db
    .selectFrom('government_invitation')
    .select(['id', 'email', 'name', 'agencyId', 'status', 'expiresAt'])
    .orderBy('createdAt', 'desc')
    .execute()
  return rows.map((row) => ({
    ...row,
    status:
      row.status === 'pending' && new Date(row.expiresAt).getTime() <= Date.now()
        ? 'expired'
        : row.status
  }))
}
export const inviteStaff = async (db: Kysely<Database>, actor: GovernmentActor, input: unknown) => {
  const data = staffInvitationInput.parse(input),
    token = randomBytes(32).toString('base64url')
  const config = portalConfig()
  const invitation = await db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { root: true, lock: true })
    if (
      data.agencyId &&
      !(await tx
        .selectFrom('agency')
        .select('id')
        .where('id', '=', data.agencyId)
        .executeTakeFirst())
    )
      fail(404, 'AGENCY_NOT_FOUND')
    const existing = await tx
      .selectFrom('government_user as g')
      .innerJoin('user as u', 'u.id', 'g.userId')
      .select('g.userId')
      .where('u.email', '=', data.email)
      .executeTakeFirst()
    if (existing) fail(409, 'STAFF_ALREADY_EXISTS')
    await tx
      .updateTable('government_invitation')
      .set({ status: 'revoked' })
      .where('email', '=', data.email)
      .where('status', '=', 'pending')
      .execute()
    const row = {
      ...data,
      id: uuid(),
      tokenHash: secretHash(token),
      status: 'pending' as const,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.days * 86400000)
    }
    await tx.insertInto('government_invitation').values(row).execute()
    return { id: row.id, expiresAt: row.expiresAt }
  })
  return { ...invitation, url: `${config.appUrl}/government/invitations/${token}` }
}
export const revokeStaffInvitation = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  id: string
) =>
  db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { root: true, lock: true })
    const result = await tx
      .updateTable('government_invitation')
      .set({ status: 'revoked' })
      .where('id', '=', id)
      .where('status', '=', 'pending')
      .returning('id')
      .executeTakeFirst()
    if (!result) fail(404, 'INVITATION_NOT_FOUND')
    return { success: true }
  })
export const previewStaffInvitation = async (db: Kysely<Database>, token: string) => {
  const row = await db
    .selectFrom('government_invitation')
    .select(['name', 'email', 'expiresAt'])
    .where('tokenHash', '=', secretHash(token))
    .where('status', '=', 'pending')
    .executeTakeFirst()
  if (!row || new Date(row.expiresAt).getTime() <= Date.now())
    return fail(410, 'INVITATION_UNAVAILABLE')
  return row
}
export const acceptStaffInvitation = async (
  db: Kysely<Database>,
  token: string,
  user: { id: string; email: string }
) =>
  db.transaction().execute(async (tx) => {
    const row = await tx
      .selectFrom('government_invitation')
      .selectAll()
      .where('tokenHash', '=', secretHash(token))
      .forUpdate()
      .executeTakeFirst()
    if (!row || row.status !== 'pending' || new Date(row.expiresAt).getTime() <= Date.now())
      return fail(410, 'INVITATION_UNAVAILABLE')
    if (row.email !== user.email.toLowerCase()) fail(403, 'INVITATION_EMAIL_MISMATCH')
    if (
      await tx
        .selectFrom('government_user')
        .select('userId')
        .where('userId', '=', user.id)
        .executeTakeFirst()
    )
      fail(409, 'STAFF_ALREADY_EXISTS')
    await tx
      .insertInto('government_user')
      .values({ userId: user.id, role: 'staff', active: true, createdAt: new Date() })
      .execute()
    if (row.agencyId)
      await tx
        .insertInto('agency_staff')
        .values({ agencyId: row.agencyId, userId: user.id })
        .execute()
    await tx
      .updateTable('government_invitation')
      .set({ status: 'accepted' })
      .where('id', '=', row.id)
      .execute()
    return { success: true }
  })
export const listTokens = async (db: Kysely<Database>, actor: GovernmentActor) => {
  await requireGovernment(db, actor, { root: true })
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
    await requireGovernment(tx, actor, { root: true, lock: true })
    if (
      !(await tx
        .selectFrom('agency')
        .select('id')
        .where('id', '=', data.agencyId)
        .executeTakeFirst())
    )
      fail(404, 'AGENCY_NOT_FOUND')
    const row = {
      id: uuid(),
      name: data.name,
      agencyId: data.agencyId,
      tokenHash: secretHash(token),
      expiresAt: new Date(Date.now() + data.expiresInDays * 86400000),
      revoked: false,
      createdAt: new Date()
    }
    await tx.insertInto('integration_token').values(row).execute()
    return { id: row.id, token, expiresAt: row.expiresAt }
  })
}
export const revokeToken = async (db: Kysely<Database>, actor: GovernmentActor, id: string) =>
  db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { root: true, lock: true })
    const result = await tx
      .updateTable('integration_token')
      .set({ revoked: true })
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst()
    if (!result) fail(404, 'TOKEN_NOT_FOUND')
    return { success: true }
  })
