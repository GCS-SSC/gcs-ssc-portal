import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import type { Database } from '../../server/db/schema'
import { createDatabase } from '../../server/utils/database'
import * as portal from '../../server/utils/portal'
import { decodePublicId, encodePublicId } from '../../server/utils/public-identifiers'
import pg from 'pg'
import { migrate } from '../../server/db/migrations'
let db: Kysely<Database>
const owner = { id: 0, name: 'Owner', email: 'owner@example.test' }
const member = { id: 0, name: 'Member', email: 'member@example.test' }
const outsider = { id: 0, name: 'Outsider', email: 'outside@example.test' }
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
  for (const user of [owner, member, outsider]) {
    const created = await db
      .insertInto('user')
      .values({
        name: user.name,
        email: user.email,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    user.id = created.id
  }
}, 60000)
afterAll(async () => {
  await db?.destroy()
})
const inviteToken = (url: string) => url.split('/').at(-1)!
describe('organization isolation and invitation lifecycle', () => {
  it('creates public organization codes backed by identity IDs', async () => {
    const { organization } = await portal.createOrganization(db, owner.id, {
      name: 'Federal services'
    })
    expect(organization.id).toMatch(/^N-[A-HJKMNP-Z2-9]{5,}$/)
    expect(organization).not.toHaveProperty('code')
    const organizationDbId = decodePublicId(organization.id, 'organization')
    expect(organizationDbId).toBeGreaterThan(0)
    expect(organization.permissions).toEqual(['user', 'admin'])
    expect(organization.memberCount).toBe(1)
    expect(organization.active).toBe(true)
    expect(organization.verified).toBe(false)
    await migrate(db)
    expect(
      (await portal.getOrganization(db, organizationDbId, owner.id)).organization
    ).toMatchObject({
      name: 'Federal services',
      id: organization.id
    })
    await expect(portal.getOrganization(db, organizationDbId, outsider.id)).rejects.toMatchObject({
      statusCode: 404
    })
    expect((await portal.listOrganizations(db, outsider.id)).organizations).toEqual([])
    await db
      .updateTable('organization')
      .set({ active: false, verified: true })
      .where('id', '=', organizationDbId)
      .execute()
    await portal.updateOrganization(db, organizationDbId, owner.id, {
      name: 'Federal services updated'
    })
    const saved = (await portal.getOrganization(db, organizationDbId, owner.id)).organization
    expect(saved).toMatchObject({ active: false, verified: true })
    expect((await portal.listOrganizations(db, owner.id)).organizations).toContainEqual(saved)
    await expect(
      portal.updateOrganization(db, organizationDbId, owner.id, {
        name: 'Federal services updated',
        active: true
      })
    ).rejects.toThrow()
  })
  it('joins once, enforces email match, grants additive permissions, transfers ownership', async () => {
    const { organization } = await portal.createOrganization(db, owner.id, {
      name: 'Digital services'
    })
    const organizationDbId = decodePublicId(organization.id, 'organization')
    const { url } = await portal.createInvitation(db, organizationDbId, owner.id, {
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
      (await portal.getOrganization(db, organizationDbId, member.id)).organization.permissions
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
      portal.createInvitation(db, organizationDbId, member.id, { email: outsider.email })
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      portal.updatePermissions(db, organizationDbId, owner.id, owner.id, { permissions: ['user'] })
    ).rejects.toMatchObject({ statusCode: 409 })
    await portal.updatePermissions(db, organizationDbId, owner.id, member.id, {
      permissions: ['user', 'admin']
    })
    await expect(
      portal.transferOwnership(db, organizationDbId, member.id, { userId: member.id })
    ).rejects.toMatchObject({ statusCode: 403 })
    await portal.transferOwnership(db, organizationDbId, owner.id, { userId: member.id })
    expect(
      (await portal.getOrganization(db, organizationDbId, owner.id)).organization.permissions
    ).toEqual(['user', 'admin'])
    await portal.updatePermissions(db, organizationDbId, member.id, owner.id, {
      permissions: ['user']
    })
    await expect(
      portal.updateOrganization(db, organizationDbId, owner.id, { name: 'No access' })
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
    const firstDbId = decodePublicId(first.id, 'organization')
    const secondDbId = decodePublicId(second.id, 'organization')
    const created = await portal.createInvitation(db, firstDbId, owner.id, { email: member.email })
    const token = inviteToken(created.url)
    await expect(
      portal.revokeInvitation(db, secondDbId, outsider.id, decodePublicId(created.invitation.id, 'invitation'))
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(portal.listInvitations(db, firstDbId, outsider.id)).rejects.toMatchObject({
      statusCode: 404
    })
    await db
      .updateTable('invitation')
      .set({ expiresAt: new Date(0) })
      .where('id', '=', decodePublicId(created.invitation.id, 'invitation'))
      .execute()
    await expect(portal.acceptInvitation(db, token, member)).rejects.toMatchObject({
      statusCode: 404
    })
    expect((await portal.listInvitations(db, firstDbId, owner.id)).invitations[0]?.status).toBe(
      'expired'
    )
    const renewed = await portal.createInvitation(db, firstDbId, owner.id, { email: member.email })
    await portal.revokeInvitation(db, firstDbId, owner.id, decodePublicId(renewed.invitation.id, 'invitation'))
    await expect(portal.previewInvitation(db, inviteToken(renewed.url))).rejects.toMatchObject({
      statusCode: 404
    })
  })
  it('validates inputs and rolls back unsuccessful ownership changes', async () => {
    await expect(portal.createOrganization(db, owner.id, { name: '' })).rejects.toThrow()
    const { organization } = await portal.createOrganization(db, owner.id, { name: 'Safe org' })
    const organizationDbId = decodePublicId(organization.id, 'organization')
    await expect(
      portal.transferOwnership(db, organizationDbId, owner.id, { userId: outsider.id })
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(
      (await portal.getOrganization(db, organizationDbId, owner.id)).organization.ownerId
    ).toBe(encodePublicId(owner.id, 'user'))
    await expect(
      portal.updatePermissions(db, organizationDbId, owner.id, owner.id, {
        permissions: ['superadmin']
      })
    ).rejects.toThrow()
  })
})
