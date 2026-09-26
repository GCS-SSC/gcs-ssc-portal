import { createHash, randomBytes } from 'node:crypto'
import type { Kysely, Selectable, Transaction } from 'kysely'
import { createError } from 'h3'
import type { Database } from '../db/schema'
import type { Invitation, Organization, Permission } from '../../shared/types/api'
import {
  invitationInput,
  organizationInput,
  permissionsInput,
  transferInput
} from '../../shared/schemas/portal'
import { portalConfig } from './config'
import { organizationCode } from '../../shared/utils/response-code'
import { encodePublicId } from './public-identifiers'
type Db = Kysely<Database> | Transaction<Database>
const fail = (statusCode: number, message: string): never => {
  throw createError({ statusCode, message, data: { code: message } })
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const iso = (date: Date) => new Date(date).toISOString()
export const getPermissions = async (
  db: Db,
  organizationId: number,
  userId: number
): Promise<Permission[]> => {
  const grants = await db
    .selectFrom('permission')
    .select('permission')
    .where('organizationId', '=', organizationId)
    .where('userId', '=', userId)
    .orderBy('permission')
    .execute()
  return ['user', ...grants.map((grant) => grant.permission)]
}
const access = async (
  db: Db,
  organizationId: number,
  userId: number,
  admin = false,
  lock = false
) => {
  let query = db.selectFrom('organization').selectAll().where('id', '=', organizationId)
  if (lock) query = query.forUpdate()
  const org = await query.executeTakeFirst()
  const member = await db
    .selectFrom('membership')
    .select('userId')
    .where('organizationId', '=', organizationId)
    .where('userId', '=', userId)
    .executeTakeFirst()
  if (!org || !member) return fail(404, 'ORGANIZATION_NOT_FOUND')
  if (admin && !(await getPermissions(db, organizationId, userId)).includes('admin'))
    fail(403, 'ADMIN_REQUIRED')
  return org
}
const mapOrganization = async (
  db: Db,
  org: Selectable<Database['organization']>,
  userId: number
): Promise<Organization> => {
  const count = await db
    .selectFrom('membership')
    .select(db.fn.countAll<number>().as('count'))
    .where('organizationId', '=', org.id)
    .executeTakeFirstOrThrow()
  return {
    ...org,
    id: organizationCode(org.id),
    ownerId: encodePublicId(org.ownerId, 'user'),
    createdAt: iso(org.createdAt),
    memberCount: Number(count.count),
    permissions: await getPermissions(db, org.id, userId)
  }
}
const mapInvite = (invite: {
  id: number
  email: string
  name: string
  status: 'pending' | 'accepted' | 'revoked'
  createdAt: Date
  expiresAt: Date
}): Invitation => ({
  id: encodePublicId(invite.id, 'invitation'),
  email: invite.email,
  name: invite.name,
  status:
    invite.status === 'pending' && new Date(invite.expiresAt).getTime() <= Date.now()
      ? 'expired'
      : invite.status,
  createdAt: iso(invite.createdAt),
  expiresAt: iso(invite.expiresAt)
})
export const listOrganizations = async (db: Db, userId: number) => {
  const organizations = await db
    .selectFrom('organization')
    .innerJoin('membership', 'membership.organizationId', 'organization.id')
    .selectAll('organization')
    .where('membership.userId', '=', userId)
    .orderBy('organization.createdAt')
    .execute()
  return {
    organizations: await Promise.all(organizations.map((org) => mapOrganization(db, org, userId)))
  }
}
export const getOrganization = async (db: Db, id: number, userId: number) => ({
  organization: await mapOrganization(db, await access(db, id, userId), userId)
})
export const createOrganization = async (db: Kysely<Database>, userId: number, body: unknown) => {
  const input = organizationInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const org = { ...input, ownerId: userId, createdAt: new Date() }
    const created = await tx
      .insertInto('organization')
      .values(org)
      .returningAll()
      .executeTakeFirstOrThrow()
    await tx
      .insertInto('membership')
      .values({ organizationId: created.id, userId, joinedAt: new Date() })
      .execute()
    await tx
      .insertInto('permission')
      .values({ organizationId: created.id, userId, permission: 'admin' })
      .execute()
    return { organization: await mapOrganization(tx, created, userId) }
  })
}
export const updateOrganization = async (
  db: Kysely<Database>,
  id: number,
  userId: number,
  body: unknown
) => {
  const input = organizationInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await access(tx, id, userId, true, true)
    await tx.updateTable('organization').set(input).where('id', '=', id).execute()
    return getOrganization(tx, id, userId)
  })
}
export const listMembers = async (db: Db, id: number, userId: number) => {
  const org = await access(db, id, userId)
  const members = await db
    .selectFrom('membership')
    .innerJoin('user', 'user.id', 'membership.userId')
    .select(['user.id as userId', 'user.name', 'user.email', 'membership.joinedAt'])
    .where('organizationId', '=', id)
    .orderBy('joinedAt')
    .execute()
  return {
    members: await Promise.all(
      members.map(async (member) => ({
        ...member,
        userId: encodePublicId(member.userId, 'user'),
        joinedAt: iso(member.joinedAt),
        isOwner: member.userId === org.ownerId,
        permissions: await getPermissions(db, id, member.userId)
      }))
    )
  }
}
export const updatePermissions = async (
  db: Kysely<Database>,
  id: number,
  actorId: number,
  targetId: number,
  body: unknown
) => {
  const input = permissionsInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const org = await access(tx, id, actorId, true, true)
    const member = await tx
      .selectFrom('membership')
      .select('userId')
      .where('organizationId', '=', id)
      .where('userId', '=', targetId)
      .executeTakeFirst()
    if (!member) fail(404, 'MEMBER_NOT_FOUND')
    if (org.ownerId === targetId && !input.permissions.includes('admin'))
      fail(409, 'OWNER_REQUIRES_ADMIN')
    await tx
      .deleteFrom('permission')
      .where('organizationId', '=', id)
      .where('userId', '=', targetId)
      .execute()
    const grants = input.permissions.filter(
      (permission): permission is Exclude<Permission, 'user'> => permission !== 'user'
    )
    if (grants.length)
      await tx
        .insertInto('permission')
        .values(grants.map((permission) => ({ organizationId: id, userId: targetId, permission })))
        .execute()
    return { success: true }
  })
}
export const transferOwnership = async (
  db: Kysely<Database>,
  id: number,
  actorId: number,
  body: unknown
) => {
  const input = transferInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const org = await access(tx, id, actorId, true, true)
    if (org.ownerId !== actorId) fail(403, 'OWNER_REQUIRED')
    if (input.userId === actorId) fail(409, 'ALREADY_OWNER')
    const member = await tx
      .selectFrom('membership')
      .select('userId')
      .where('organizationId', '=', id)
      .where('userId', '=', input.userId)
      .executeTakeFirst()
    if (!member) fail(404, 'MEMBER_NOT_FOUND')
    await tx
      .insertInto('permission')
      .values({ organizationId: id, userId: input.userId, permission: 'admin' })
      .onConflict((conflict) => conflict.doNothing())
      .execute()
    await tx
      .updateTable('organization')
      .set({ ownerId: input.userId })
      .where('id', '=', id)
      .execute()
    return getOrganization(tx, id, actorId)
  })
}
export const listInvitations = async (db: Db, id: number, userId: number) => {
  await access(db, id, userId, true)
  return {
    invitations: (
      await db
        .selectFrom('invitation')
        .selectAll()
        .where('organizationId', '=', id)
        .orderBy('createdAt', 'desc')
        .execute()
    ).map(mapInvite)
  }
}
export const createInvitation = async (
  db: Kysely<Database>,
  id: number,
  userId: number,
  body: unknown
) => {
  const input = invitationInput.parse(body)
  const config = portalConfig()
  return db.transaction().execute(async (tx) => {
    await access(tx, id, userId, true, true)
    const existing = await tx
      .selectFrom('membership')
      .innerJoin('user', 'user.id', 'membership.userId')
      .select('user.id')
      .where('organizationId', '=', id)
      .where('email', '=', input.email)
      .executeTakeFirst()
    if (existing) fail(409, 'ALREADY_MEMBER')
    await tx
      .updateTable('invitation')
      .set({ status: 'revoked' })
      .where('organizationId', '=', id)
      .where('email', '=', input.email)
      .where('status', '=', 'pending')
      .execute()
    const token = randomBytes(32).toString('base64url')
    const invitation = {
      organizationId: id,
      ...input,
      tokenHash: hash(token),
      status: 'pending' as const,
      createdBy: userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.days * 86400000)
    }
    const created = await tx
      .insertInto('invitation')
      .values(invitation)
      .returningAll()
      .executeTakeFirstOrThrow()
    return { invitation: mapInvite(created), url: `${config.appUrl}/invitations/${token}` }
  })
}
export const revokeInvitation = async (
  db: Kysely<Database>,
  id: number,
  actorId: number,
  invitationId: number
) =>
  db.transaction().execute(async (tx) => {
    await access(tx, id, actorId, true, true)
    const row = await tx
      .updateTable('invitation')
      .set({ status: 'revoked' })
      .where('organizationId', '=', id)
      .where('id', '=', invitationId)
      .where('status', '=', 'pending')
      .returning('id')
      .executeTakeFirst()
    if (!row) fail(404, 'INVITATION_NOT_FOUND')
    return { success: true }
  })
const findInvitation = async (db: Db, token: string) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return fail(404, 'INVITATION_UNAVAILABLE')
  const invite = await db
    .selectFrom('invitation')
    .selectAll()
    .where('tokenHash', '=', hash(token))
    .executeTakeFirst()
  if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt).getTime() <= Date.now())
    return fail(404, 'INVITATION_UNAVAILABLE')
  return invite
}
export const previewInvitation = async (db: Db, token: string) => {
  const invite = await findInvitation(db, token)
  const org = await db
    .selectFrom('organization')
    .select('name')
    .where('id', '=', invite.organizationId)
    .executeTakeFirstOrThrow()
  return {
    organizationName: org.name,
    email: invite.email,
    name: invite.name,
    expiresAt: iso(invite.expiresAt)
  }
}
export const acceptInvitation = async (db: Kysely<Database>, token: string, user: { id: number; name: string; email: string }) => {
  const initial = await findInvitation(db, token)
  return db.transaction().execute(async (tx) => {
    // All writes lock the organization before invitation/member rows: one consistent order.
    await tx
      .selectFrom('organization')
      .select('id')
      .where('id', '=', initial.organizationId)
      .forUpdate()
      .executeTakeFirstOrThrow()
    const invite = await findInvitation(tx, token)
    if (invite.email !== user.email.toLowerCase()) fail(403, 'INVITATION_EMAIL_MISMATCH')
    await tx
      .insertInto('membership')
      .values({ organizationId: invite.organizationId, userId: user.id, joinedAt: new Date() })
      .onConflict((conflict) => conflict.doNothing())
      .execute()
    await tx
      .updateTable('invitation')
      .set({ status: 'accepted' })
      .where('id', '=', invite.id)
      .execute()
    // A shareable invitation grants organization access, never mailbox verification.
    return getOrganization(tx, invite.organizationId, user.id)
  })
}
