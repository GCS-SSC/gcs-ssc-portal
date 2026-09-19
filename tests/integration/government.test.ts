import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Kysely } from 'kysely'
import pg from 'pg'
import { v7 as uuid } from 'uuid'
import { createDatabase } from '../../server/utils/database'
import type { Database } from '../../server/db/schema'
import { pgliteDialect } from '../../server/db/pglite-dialect'
import { migrate } from '../../server/db/migrations'
import * as admin from '../../server/utils/government-admin'
import * as structure from '../../server/utils/government-structure'
import * as portal from '../../server/utils/portal'
import {
  governmentAccess,
  secretHash,
  type GovernmentActor
} from '../../server/utils/government-access'
let db: Kysely<Database>
let root: GovernmentActor
const staff = { id: 'better-auth-staff-id', name: 'Government staff', email: 'staff@example.test' }
const applicant = { id: 'org-owner-id', name: 'Applicant', email: 'applicant@example.test' }
const unrelated = { id: 'unrelated-staff-id', name: 'Other staff', email: 'other@example.test' }
const staffActor: GovernmentActor = { kind: 'user', userId: staff.id }
const applicantActor: GovernmentActor = { kind: 'user', userId: applicant.id }
const otherActor: GovernmentActor = { kind: 'user', userId: unrelated.id }
const tokenFrom = (url: string) => url.split('/').at(-1)!
const names = (name: string) => ({ nameEn: name, nameFr: `${name} FR` })
beforeAll(async () => {
  const url = process.env.PORTAL_TEST_DATABASE_URL
  if (url) {
    if (!new URL(url).pathname.endsWith('_test'))
      throw new Error('Disposable test database required')
    const guard = new pg.Client({ connectionString: url })
    await guard.connect()
    try {
      const existing = await guard.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' LIMIT 1"
      )
      if (existing.rowCount) throw new Error('Refusing a nonempty PostgreSQL test database')
    } finally {
      await guard.end()
    }
  }
  db = await createDatabase({ url })
  const result = await admin.bootstrapRoot(db, {
    name: 'Root',
    email: 'root@example.test',
    password: 'Root-test-only-2026!'
  })
  root = { kind: 'user', userId: result.id }
  for (const user of [staff, applicant, unrelated])
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
describe('government identity and agency boundaries', () => {
  it('bootstraps one root and never elevates an existing account implicitly', async () => {
    await expect(
      admin.bootstrapRoot(db, {
        name: 'Another root',
        email: applicant.email,
        password: 'Root-test-only-2026!'
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(await governmentAccess(db, applicant.id)).toBeNull()
    expect(
      await db.selectFrom('government_user').selectAll().where('role', '=', 'root').execute()
    ).toHaveLength(1)
    await expect(
      admin.inviteStaff(db, applicantActor, { ...names('ignored'), email: staff.email })
    ).rejects.toThrow()
    await expect(
      structure.createAgency(db, applicantActor, names('Unauthorized'))
    ).rejects.toMatchObject({ statusCode: 403 })
  })
  it('root invitations are email bound, single use, expiring and revocable', async () => {
    const invitation = await admin.inviteStaff(db, root, { email: staff.email, name: staff.name })
    const token = tokenFrom(invitation.url)
    expect((await admin.previewStaffInvitation(db, token)).email).toBe(staff.email)
    await expect(admin.acceptStaffInvitation(db, token, applicant)).rejects.toMatchObject({
      statusCode: 403
    })
    const accepted = await Promise.allSettled([
      admin.acceptStaffInvitation(db, token, staff),
      admin.acceptStaffInvitation(db, token, staff)
    ])
    expect(accepted.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await governmentAccess(db, staff.id)).toEqual({ role: 'staff', agencyIds: [] })
    expect(
      (
        await db
          .selectFrom('user')
          .select('emailVerified')
          .where('id', '=', staff.id)
          .executeTakeFirstOrThrow()
      ).emailVerified
    ).toBe(false)
    await expect(admin.listStaff(db, staffActor)).rejects.toMatchObject({ statusCode: 403 })
    const expired = await admin.inviteStaff(db, root, {
      email: unrelated.email,
      name: unrelated.name
    })
    await db
      .updateTable('government_invitation')
      .set({ expiresAt: new Date(0) })
      .where('id', '=', expired.id)
      .execute()
    await expect(
      admin.acceptStaffInvitation(db, tokenFrom(expired.url), unrelated)
    ).rejects.toMatchObject({ statusCode: 410 })
    const revoked = await admin.inviteStaff(db, root, {
      email: unrelated.email,
      name: unrelated.name
    })
    await admin.revokeStaffInvitation(db, root, revoked.id)
    await expect(
      admin.acceptStaffInvitation(db, tokenFrom(revoked.url), unrelated)
    ).rejects.toMatchObject({ statusCode: 410 })
    const fresh = await admin.inviteStaff(db, root, {
      email: unrelated.email,
      name: unrelated.name
    })
    await admin.acceptStaffInvitation(db, tokenFrom(fresh.url), unrelated)
  })
  it('staff can set up their own agency but root controls access to other agencies', async () => {
    const { agency } = await structure.createAgency(db, staffActor, names('Own agency'))
    expect(agency.id[14]).toBe('7')
    const { agency: other } = await structure.createAgency(db, otherActor, names('Other agency'))
    expect((await structure.listAgencies(db, staffActor)).agencies.map((a) => a.id)).toEqual([
      agency.id
    ])
    await expect(structure.agencyStructure(db, staffActor, other.id)).rejects.toMatchObject({
      statusCode: 404
    })
    await expect(
      structure.createProgram(db, staffActor, { ...names('Intrusion'), agencyId: other.id })
    ).rejects.toMatchObject({ statusCode: 404 })
    await admin.changeStaff(db, root, staff.id, { agencyIds: [agency.id, other.id] }, 'access')
    expect((await structure.agencyStructure(db, staffActor, other.id)).agency.id).toBe(other.id)
    await admin.changeStaff(db, root, staff.id, { agencyIds: [agency.id] }, 'access')
    await expect(
      structure.updateAgency(db, staffActor, other.id, names('Intrusion'))
    ).rejects.toMatchObject({ statusCode: 404 })
    await admin.changeStaff(db, root, staff.id, { active: false }, 'status')
    expect(await governmentAccess(db, staff.id)).toBeNull()
    await expect(structure.createAgency(db, staffActor, names('Disabled'))).rejects.toMatchObject({
      statusCode: 403
    })
    await admin.changeStaff(db, root, staff.id, { active: true }, 'status')
    if (root.kind !== 'user') throw new Error('Root fixture missing')
    await expect(
      admin.changeStaff(db, root, root.userId, { active: false }, 'status')
    ).rejects.toMatchObject({ statusCode: 403 })
  })
  it('publishes bilingual hierarchical calls only to explicitly permitted organization members', async () => {
    const { agency } = await structure.createAgency(db, staffActor, names('Funding agency'))
    const { program } = await structure.createProgram(db, staffActor, {
      ...names('Program'),
      agencyId: agency.id
    })
    const { stream } = await structure.createStream(db, staffActor, {
      ...names('Stream'),
      programId: program.id
    })
    const input = {
      ...names('Summer call'),
      streamId: stream.id,
      startDate: '2026-07-01',
      endDate: '2026-09-30'
    }
    await expect(
      structure.saveCall(db, staffActor, { ...input, endDate: '2026-02-30' })
    ).rejects.toThrow()
    await expect(
      structure.saveCall(db, staffActor, { ...input, endDate: '2026-01-01' })
    ).rejects.toThrow()
    const call = await structure.saveCall(db, staffActor, input)
    const { organization } = await portal.createOrganization(db, applicant.id, {
      name: 'Applicant organization'
    })
    await expect(
      structure.fundingCatalogue(db, organization.id, applicant.id)
    ).rejects.toMatchObject({ statusCode: 403 })
    await portal.updatePermissions(db, organization.id, applicant.id, applicant.id, {
      permissions: ['user', 'admin', 'application']
    })
    expect((await structure.fundingCatalogue(db, organization.id, applicant.id)).calls).toEqual([])
    await structure.publishCall(db, staffActor, call.id, { published: true })
    const published = (await structure.fundingCatalogue(db, organization.id, applicant.id)).calls
    expect(published).toHaveLength(1)
    expect(published[0]).toMatchObject({
      ...input,
      agencyId: agency.id,
      programId: program.id,
      agencyNameFr: agency.nameFr
    })
    await expect(structure.saveCall(db, staffActor, input, call.id)).rejects.toMatchObject({
      statusCode: 409
    })
    await expect(structure.fundingCatalogue(db, organization.id, staff.id)).rejects.toMatchObject({
      statusCode: 404
    })
    await expect(
      structure.publishCall(db, applicantActor, call.id, { published: false })
    ).rejects.toMatchObject({ statusCode: 403 })
    await structure.publishCall(db, staffActor, call.id, { published: false })
    await structure.saveCall(db, staffActor, { ...input, nameFr: 'Appel modifié' }, call.id)
    expect((await structure.fundingCatalogue(db, organization.id, applicant.id)).calls).toEqual([])
    await portal.updatePermissions(db, organization.id, applicant.id, applicant.id, {
      permissions: ['user', 'admin']
    })
    await expect(
      structure.fundingCatalogue(db, organization.id, applicant.id)
    ).rejects.toMatchObject({ statusCode: 403 })
  })
  it('integration credentials cannot escape their agency, provision identities, or survive revocation', async () => {
    const { agency } = await structure.createAgency(db, root, names('Integration agency'))
    const { agency: foreign } = await structure.createAgency(db, root, names('Foreign agency'))
    const token = await admin.createToken(db, root, { agencyId: agency.id, name: 'Extension' })
    const actor: GovernmentActor = { kind: 'integration', tokenHash: secretHash(token.token) }
    expect(JSON.stringify(await admin.listTokens(db, root))).not.toContain(token.token)
    expect(
      (
        await db
          .selectFrom('integration_token')
          .select('tokenHash')
          .where('id', '=', token.id)
          .executeTakeFirstOrThrow()
      ).tokenHash
    ).not.toBe(token.token)
    expect((await structure.listAgencies(db, actor)).agencies.map((a) => a.id)).toEqual([agency.id])
    await structure.updateAgency(db, actor, agency.id, names('Updated agency'))
    await expect(structure.createAgency(db, actor, names('Escape'))).rejects.toMatchObject({
      statusCode: 403
    })
    await expect(
      admin.inviteStaff(db, actor, { email: 'new@example.test', name: 'New' })
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      admin.createToken(db, actor, { agencyId: foreign.id, name: 'Escalation' })
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      structure.createProgram(db, actor, { ...names('Foreign'), agencyId: foreign.id })
    ).rejects.toMatchObject({ statusCode: 404 })
    const { program } = await structure.createProgram(db, actor, {
      ...names('API program'),
      agencyId: agency.id
    })
    const { stream } = await structure.createStream(db, actor, {
      ...names('API stream'),
      programId: program.id
    })
    const { program: fp } = await structure.createProgram(db, root, {
      ...names('Foreign program'),
      agencyId: foreign.id
    })
    const { stream: fs } = await structure.createStream(db, root, {
      ...names('Foreign stream'),
      programId: fp.id
    })
    const input = {
      ...names('API call'),
      streamId: stream.id,
      startDate: '2027-01-01',
      endDate: '2027-12-31'
    }
    const own = await structure.saveCall(db, actor, input)
    const external = await structure.saveCall(db, root, { ...input, streamId: fs.id })
    await structure.publishCall(db, actor, own.id, { published: true })
    await expect(structure.saveCall(db, actor, input, external.id)).rejects.toMatchObject({
      statusCode: 404
    })
    await expect(
      structure.publishCall(db, actor, external.id, { published: true })
    ).rejects.toMatchObject({ statusCode: 404 })
    await admin.revokeToken(db, root, token.id)
    await expect(structure.agencyStructure(db, actor, agency.id)).rejects.toMatchObject({
      statusCode: 401
    })
    const expired = await admin.createToken(db, root, { agencyId: agency.id, name: 'Expired' })
    await db
      .updateTable('integration_token')
      .set({ expiresAt: new Date(0) })
      .where('id', '=', expired.id)
      .execute()
    await expect(
      structure.listAgencies(db, { kind: 'integration', tokenHash: secretHash(expired.token) })
    ).rejects.toMatchObject({ statusCode: 401 })
  })
  it('upgrades a populated original schema without losing organizations or grants', async () => {
    const old = new Kysely<Database>({ dialect: pgliteDialect('memory://') })
    try {
      await migrate(old, '001_initial')
      const now = new Date(),
        id = uuid()
      await old
        .insertInto('user')
        .values({ ...applicant, emailVerified: false, image: null, createdAt: now, updatedAt: now })
        .execute()
      await old
        .insertInto('organization')
        .values({
          id,
          name: 'Existing organization',
          description: '',
          ownerId: applicant.id,
          createdAt: now
        })
        .execute()
      await old
        .insertInto('membership')
        .values({ organizationId: id, userId: applicant.id, joinedAt: now })
        .execute()
      await old
        .insertInto('permission')
        .values({ organizationId: id, userId: applicant.id, permission: 'admin' })
        .execute()
      await migrate(old)
      await expect(
        admin.bootstrapRoot(old, {
          name: applicant.name,
          email: applicant.email,
          password: 'Root-test-only-2026!'
        })
      ).rejects.toMatchObject({ statusCode: 409 })
      expect(await governmentAccess(old, applicant.id)).toBeNull()
      expect((await portal.getOrganization(old, id, applicant.id)).organization.name).toBe(
        'Existing organization'
      )
      await portal.updatePermissions(old, id, applicant.id, applicant.id, {
        permissions: ['user', 'admin', 'application']
      })
      expect(
        (await portal.getOrganization(old, id, applicant.id)).organization.permissions
      ).toEqual(['user', 'admin', 'application'])
      await migrate(old)
    } finally {
      await old.destroy()
    }
  })
})
