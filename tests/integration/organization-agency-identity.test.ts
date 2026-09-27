import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import type { Database } from '../../server/db/schema'
import { createDatabase } from '../../server/utils/database'
import { createAdministrator } from '../../server/utils/administrator-accounts'
import { createAgency, createProgram, createStream } from '../../server/utils/government-structure'
import { createToken } from '../../server/utils/government-admin'
import { secretHash, type GovernmentActor } from '../../server/utils/government-access'
import { createOrganization } from '../../server/utils/portal'
import { decodePublicId, encodePublicId, publicReferences } from '../../server/utils/public-identifiers'
import { saveAgreement } from '../../server/utils/agreements'
import { listAgencyOrganizations, verifyAgencyOrganization } from '../../server/utils/organization-agency-identity'

let db: Kysely<Database>
let root: GovernmentActor
let agencyOne: number
let agencyTwo: number
let agencyOneActor: GovernmentActor
let agencyTwoActor: GovernmentActor
let ownerId: number
let organizationId: number
let otherOrganizationId: number

const names = (name: string) => ({ nameEn: name, nameFr: `${name} FR` })

beforeAll(async () => {
  db = await createDatabase({ url: process.env.PORTAL_TEST_DATABASE_URL })
  const admin = await createAdministrator(db, {
    name: 'Organization API administrator',
    email: 'organization-api-admin@example.test',
    password: 'Admin-test-only-2026!'
  })
  root = { kind: 'administrator', administratorId: admin.id }
  ownerId = (await db.insertInto('user').values({
    name: 'Portal owner', email: 'portal-owner@example.test', emailVerified: false,
    image: null, createdAt: new Date(), updatedAt: new Date()
  }).returning('id').executeTakeFirstOrThrow()).id
  const first = await createOrganization(db, ownerId, {
    name: 'North 100% organization', description: 'Works in the north'
  })
  const second = await createOrganization(db, ownerId, {
    name: 'South organization', description: 'Works in the south'
  })
  organizationId = decodePublicId(first.organization.id, 'organization')
  otherOrganizationId = decodePublicId(second.organization.id, 'organization')
  agencyOne = (await createAgency(db, root, names('Agency one'))).agency.id
  agencyTwo = (await createAgency(db, root, names('Agency two'))).agency.id
  const tokenOne = await createToken(db, root, { agencyId: agencyOne, name: 'One', expiresInDays: 30 })
  const tokenTwo = await createToken(db, root, { agencyId: agencyTwo, name: 'Two', expiresInDays: 30 })
  agencyOneActor = { kind: 'integration', tokenHash: secretHash(tokenOne.token) }
  agencyTwoActor = { kind: 'integration', tokenHash: secretHash(tokenTwo.token) }
}, 60000)

afterAll(async () => { await db?.destroy() })

describe('agency organization discovery', () => {
  it('exposes owner details, description, numeric stats, and only the requesting agency identity', async () => {
    const extraMember = (await db.insertInto('user').values({
      name: 'Second member', email: 'second-member@example.test', emailVerified: false,
      image: null, createdAt: new Date(), updatedAt: new Date()
    }).returning('id').executeTakeFirstOrThrow()).id
    await db.insertInto('membership').values({
      organizationId, userId: extraMember, joinedAt: new Date()
    }).execute()
    const firstProgram = await createProgram(db, root, { ...names('Program one'), agencyId: agencyOne })
    const secondProgram = await createProgram(db, root, { ...names('Program two'), agencyId: agencyTwo })
    const firstStream = await createStream(db, root, { ...names('Stream one'), programId: firstProgram.program.id })
    const secondStream = await createStream(db, root, { ...names('Stream two'), programId: secondProgram.program.id })
    for (const [streamId, agreementNumber] of [
      [firstStream.stream.id, 'A-ONE'], [secondStream.stream.id, 'A-TWO']
    ] as const) {
      await saveAgreement(db, root, {
        ...names(agreementNumber), organizationId, streamId, agreementNumber,
        config: { fiscalYears: [], budgetLines: [] }
      })
    }
    await verifyAgencyOrganization(db, agencyOneActor, agencyOne, organizationId, {
      foreignApplicantRecipientId: '101'
    })
    await verifyAgencyOrganization(db, agencyTwoActor, agencyTwo, organizationId, {
      foreignApplicantRecipientId: '202'
    })
    const result = await listAgencyOrganizations(db, agencyOneActor, agencyOne)
    const organization = result.organizations.find(row => row.id === organizationId)
    expect(organization).toMatchObject({
      name: 'North 100% organization', description: 'Works in the north',
      ownerName: 'Portal owner', ownerEmail: 'portal-owner@example.test',
      memberCount: 2, agreementCount: 1, foreignApplicantRecipientId: '101', verified: true
    })
    expect(typeof organization?.memberCount).toBe('number')
    expect(typeof organization?.agreementCount).toBe('number')
    expect(organization?.verifiedAt).toEqual(expect.any(String))
    const publicResult = publicReferences(result)
    expect(publicResult.organizations.find(row => row.id === encodePublicId(organizationId, 'organization'))?.ownerEmail)
      .toBe('portal-owner@example.test')
    await expect(listAgencyOrganizations(db, agencyOneActor, agencyTwo)).rejects.toMatchObject({ statusCode: 404 })
    const secondAgency = await listAgencyOrganizations(db, agencyTwoActor, agencyTwo)
    expect(secondAgency.organizations.find(row => row.id === organizationId)?.foreignApplicantRecipientId)
      .toBe('202')
  })

  it('paginates with public organization cursors and escapes literal search characters', async () => {
    const now = new Date()
    await db.insertInto('organization').values(Array.from({ length: 101 }, (_, index) => ({
      name: `Paged organization ${String(index).padStart(3, '0')}`,
      description: '', ownerId, createdAt: now, active: true, verified: false
    }))).execute()
    const first = await listAgencyOrganizations(db, agencyOneActor, agencyOne, { search: 'Paged' })
    expect(first.organizations).toHaveLength(100)
    expect(first.nextAfter).toMatch(/^N/)
    const second = await listAgencyOrganizations(db, agencyOneActor, agencyOne, {
      search: 'Paged', after: first.nextAfter
    })
    expect(second.organizations).toHaveLength(1)
    expect(second.nextAfter).toBeNull()
    expect(new Set([...first.organizations, ...second.organizations].map(row => row.id)).size).toBe(101)
    const literal = await listAgencyOrganizations(db, agencyOneActor, agencyOne, { search: '100%' })
    expect(literal.organizations.map(row => row.id)).toEqual([organizationId])
    await expect(listAgencyOrganizations(db, agencyOneActor, agencyOne, { after: 'not-a-code' }))
      .rejects.toMatchObject({ statusCode: 404 })
    await db.updateTable('organization').set({ active: false }).where('id', '=', otherOrganizationId).execute()
    const inactive = await listAgencyOrganizations(db, agencyOneActor, agencyOne, { search: 'South' })
    expect(inactive.organizations).toMatchObject([{ id: otherOrganizationId, active: false }])
  })
})
