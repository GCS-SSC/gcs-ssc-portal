import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Kysely } from 'kysely'
import type { Database } from '../../server/db/schema'
import { createDatabase } from '../../server/utils/database'
import * as portal from '../../server/utils/portal'
import pg from 'pg'
import { migrate } from '../../server/db/migrations'
import { pgliteDialect } from '../../server/db/pglite-dialect'
let db: Kysely<Database>
const owner = { id: 'owner', name: 'Owner', email: 'owner@example.test' }
const member = { id: 'member', name: 'Member', email: 'member@example.test' }
const outsider = { id: 'outsider', name: 'Outsider', email: 'outside@example.test' }
beforeAll(async () => {
  const url = process.env.PORTAL_TEST_DATABASE_URL
  if (url) {
    const parsed = new URL(url)
    if (
      !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      !decodeURIComponent(parsed.pathname).endsWith('_test')
    )
      throw new Error('PORTAL_TEST_DATABASE_URL must name a PostgreSQL database ending in _test')
    const guard = new pg.Client({ connectionString: url })
    await guard.connect()
    try {
      const existing = await guard.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' LIMIT 1"
      )
      if (existing.rowCount)
        throw new Error(
          'PostgreSQL integration tests require an empty disposable database; refusing to modify existing tables'
        )
    } finally {
      await guard.end()
    }
  }
  db = await createDatabase({ url })
  for (const user of [owner, member, outsider])
    await db
      .insertInto('user')
      .values({
        ...user,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .execute()
}, 60000)
afterAll(async () => {
  await db?.destroy()
})
const inviteToken = (url: string) => url.split('/').at(-1)!
describe('organization isolation and invitation lifecycle', () => {
  it('adds status defaults to organizations created before migration 007', async () => {
    const upgradeDb = new Kysely<Database>({ dialect: pgliteDialect('memory://') })
    try {
      await migrate(upgradeDb, '006_administrators')
      await upgradeDb
        .insertInto('user')
        .values({
          ...owner,
          emailVerified: false,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute()
      const id = '0199a000-0000-7000-8000-000000000001'
      await upgradeDb
        .insertInto('organization')
        .values({
          id,
          name: 'Existing organization',
          description: '',
          ownerId: owner.id,
          createdAt: new Date()
        })
        .execute()
      await migrate(upgradeDb)
      const upgraded = await upgradeDb
        .selectFrom('organization')
        .select(['name', 'active', 'verified'])
        .where('id', '=', id)
        .executeTakeFirstOrThrow()
      expect(upgraded).toEqual({ name: 'Existing organization', active: true, verified: false })
    } finally {
      await upgradeDb.destroy()
    }
  })
  it('creates UUIDv7 organizations and preserves data across rerun migrations', async () => {
    const { organization } = await portal.createOrganization(db, owner.id, {
      name: 'Federal services'
    })
    expect(organization.id[14]).toBe('7')
    expect(organization.permissions).toEqual(['user', 'admin'])
    expect(organization.memberCount).toBe(1)
    expect(organization.active).toBe(true)
    expect(organization.verified).toBe(false)
    await migrate(db)
    expect((await portal.getOrganization(db, organization.id, owner.id)).organization.name).toBe(
      'Federal services'
    )
    await expect(portal.getOrganization(db, organization.id, outsider.id)).rejects.toMatchObject({
      statusCode: 404
    })
    expect((await portal.listOrganizations(db, outsider.id)).organizations).toEqual([])
    await db
      .updateTable('organization')
      .set({ active: false, verified: true })
      .where('id', '=', organization.id)
      .execute()
    await portal.updateOrganization(db, organization.id, owner.id, {
      name: 'Federal services updated'
    })
    const saved = (await portal.getOrganization(db, organization.id, owner.id)).organization
    expect(saved).toMatchObject({ active: false, verified: true })
    expect((await portal.listOrganizations(db, owner.id)).organizations).toContainEqual(saved)
    await expect(
      portal.updateOrganization(db, organization.id, owner.id, {
        name: 'Federal services updated',
        active: true
      })
    ).rejects.toThrow()
  })
  it('joins once, enforces email match, grants additive permissions, transfers ownership', async () => {
    const { organization } = await portal.createOrganization(db, owner.id, {
      name: 'Digital services'
    })
    const { url } = await portal.createInvitation(db, organization.id, owner.id, {
      email: member.email,
      name: member.name
    })
    const token = inviteToken(url)
    expect((await portal.previewInvitation(db, token)).organizationName).toBe('Digital services')
    await expect(portal.acceptInvitation(db, token, outsider)).rejects.toMatchObject({
      statusCode: 403
    })
    const results = await Promise.allSettled([
      portal.acceptInvitation(db, token, member),
      portal.acceptInvitation(db, token, member)
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(
      (await portal.getOrganization(db, organization.id, member.id)).organization.permissions
    ).toEqual(['user'])
    // The admin can send this manual link anywhere: it cannot verify the account's claimed mailbox.
    expect(
      (
        await db
          .selectFrom('user')
          .select('emailVerified')
          .where('id', '=', member.id)
          .executeTakeFirstOrThrow()
      ).emailVerified
    ).toBe(false)
    await expect(
      portal.createInvitation(db, organization.id, member.id, { email: outsider.email })
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      portal.updatePermissions(db, organization.id, owner.id, owner.id, { permissions: ['user'] })
    ).rejects.toMatchObject({ statusCode: 409 })
    await portal.updatePermissions(db, organization.id, owner.id, member.id, {
      permissions: ['user', 'admin']
    })
    await expect(
      portal.transferOwnership(db, organization.id, member.id, { userId: member.id })
    ).rejects.toMatchObject({ statusCode: 403 })
    await portal.transferOwnership(db, organization.id, owner.id, { userId: member.id })
    expect(
      (await portal.getOrganization(db, organization.id, owner.id)).organization.permissions
    ).toEqual(['user', 'admin'])
    await portal.updatePermissions(db, organization.id, member.id, owner.id, {
      permissions: ['user']
    })
    await expect(
      portal.updateOrganization(db, organization.id, owner.id, { name: 'No access' })
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(portal.previewInvitation(db, token)).rejects.toMatchObject({ statusCode: 404 })
  })
  it('rejects expired/revoked links and cross-organization invitation actions', async () => {
    const { organization: first } = await portal.createOrganization(db, owner.id, {
      name: 'First org'
    })
    const { organization: second } = await portal.createOrganization(db, outsider.id, {
      name: 'Second org'
    })
    const created = await portal.createInvitation(db, first.id, owner.id, { email: member.email })
    const token = inviteToken(created.url)
    await expect(
      portal.revokeInvitation(db, second.id, outsider.id, created.invitation.id)
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(portal.listInvitations(db, first.id, outsider.id)).rejects.toMatchObject({
      statusCode: 404
    })
    await db
      .updateTable('invitation')
      .set({ expiresAt: new Date(0) })
      .where('id', '=', created.invitation.id)
      .execute()
    await expect(portal.acceptInvitation(db, token, member)).rejects.toMatchObject({
      statusCode: 404
    })
    expect((await portal.listInvitations(db, first.id, owner.id)).invitations[0]?.status).toBe(
      'expired'
    )
    const renewed = await portal.createInvitation(db, first.id, owner.id, { email: member.email })
    await portal.revokeInvitation(db, first.id, owner.id, renewed.invitation.id)
    await expect(portal.previewInvitation(db, inviteToken(renewed.url))).rejects.toMatchObject({
      statusCode: 404
    })
  })
  it('validates inputs and rolls back unsuccessful ownership changes', async () => {
    await expect(portal.createOrganization(db, owner.id, { name: '' })).rejects.toThrow()
    const { organization } = await portal.createOrganization(db, owner.id, { name: 'Safe org' })
    await expect(
      portal.transferOwnership(db, organization.id, owner.id, { userId: outsider.id })
    ).rejects.toMatchObject({ statusCode: 404 })
    expect((await portal.getOrganization(db, organization.id, owner.id)).organization.ownerId).toBe(
      owner.id
    )
    await expect(
      portal.updatePermissions(db, organization.id, owner.id, owner.id, {
        permissions: ['superadmin']
      })
    ).rejects.toThrow()
  })
})
