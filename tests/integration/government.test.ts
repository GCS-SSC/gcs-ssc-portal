import { afterAll, beforeAll, expect, it } from 'vitest'
import { Kysely } from 'kysely'
import { createDatabase } from '../../server/utils/database'
import type { H3Event } from 'h3'
import type { Database } from '../../server/db/schema'
import { pgliteDialect } from '../../server/db/pglite-dialect'
import { migrate } from '../../server/db/migrations'
import { createAdministrator } from '../../server/utils/administrator-accounts'
import { signInAdministrator } from '../../server/utils/administrator-auth'
import {
  createAgency,
  createProgram,
  agencyStructure
} from '../../server/utils/government-structure'
import { createToken, replaceToken, revokeToken } from '../../server/utils/government-admin'
import {
  requireGovernment,
  secretHash,
  requireOrganizationAccount
} from '../../server/utils/government-access'

let db: Kysely<Database>
let administratorId: number
const names = (name: string) => ({ nameEn: name, nameFr: `${name} FR` })
beforeAll(async () => {
  db = await createDatabase({ url: process.env.PORTAL_TEST_DATABASE_URL })
  administratorId = (
    await createAdministrator(db, {
      name: 'System Administrator',
      email: 'admin@example.test',
      password: 'Admin-test-only-2026!'
    })
  ).id
})
afterAll(async () => {
  await db?.destroy()
})

it('keeps administrator credentials outside user accounts and permits multiple administrators', async () => {
  const second = await createAdministrator(db, {
    name: 'Second Administrator',
    email: 'second@example.test',
    password: 'Admin-test-only-2026!'
  })
  expect(second.id).not.toBe(administratorId)
  expect(await db.selectFrom('user').selectAll().execute()).toEqual([])
  expect(await db.selectFrom('administrator').selectAll().execute()).toHaveLength(2)
  await expect(requireOrganizationAccount(db, administratorId)).resolves.toBeUndefined()
})

it('limits repeated administrator password guesses', async () => {
  const event = { node: { req: { socket: { remoteAddress: 'rate-limit-test' } } } } as H3Event
  const input = { email: 'admin@example.test', password: 'wrong-password' }
  for (let attempt = 0; attempt < 10; attempt++)
    await expect(signInAdministrator(db, event, input)).rejects.toMatchObject({ statusCode: 401 })
  await expect(signInAdministrator(db, event, input)).rejects.toMatchObject({ statusCode: 429 })
})

it('registers agencies and issues isolated, revocable extension keys', async () => {
  const actor = { kind: 'administrator' as const, administratorId }
  const agency = (await createAgency(db, actor, names('First agency'))).agency
  const other = (await createAgency(db, actor, names('Other agency'))).agency
  const issued = await createToken(db, actor, {
    agencyId: agency.id,
    name: 'Extension',
    expiresInDays: 30
  })
  const machine = { kind: 'integration' as const, tokenHash: secretHash(issued.token) }
  expect((await requireGovernment(db, machine)).agencyIds).toEqual([agency.id])
  await createProgram(db, machine, { ...names('Program'), agencyId: agency.id })
  expect((await agencyStructure(db, machine, agency.id)).programs).toHaveLength(1)
  await expect(agencyStructure(db, machine, other.id)).rejects.toMatchObject({ statusCode: 404 })
  await expect(createAgency(db, machine, names('Forbidden'))).rejects.toMatchObject({
    statusCode: 403
  })
  const replacement = await replaceToken(db, actor, issued.id)
  expect(replacement.token).toMatch(/^gcs_/)
  expect(replacement.token).not.toBe(issued.token)
  await expect(requireGovernment(db, machine)).rejects.toMatchObject({ statusCode: 401 })
  const replacementActor = {
    kind: 'integration' as const,
    tokenHash: secretHash(replacement.token)
  }
  expect((await requireGovernment(db, replacementActor)).agencyIds).toEqual([agency.id])
  await revokeToken(db, actor, issued.id)
  await expect(requireGovernment(db, replacementActor)).rejects.toMatchObject({ statusCode: 401 })
  await expect(replaceToken(db, actor, issued.id)).rejects.toMatchObject({ statusCode: 409 })
})

it('allows permanent keys and preserves their expiry when replaced', async () => {
  const actor = { kind: 'administrator' as const, administratorId }
  const agency = (await createAgency(db, actor, names('Permanent agency'))).agency
  const issued = await createToken(db, actor, {
    agencyId: agency.id,
    name: 'Permanent connector',
    expiresInDays: null
  })
  expect(issued.expiresAt).toBeNull()
  expect(
    (await requireGovernment(db, { kind: 'integration', tokenHash: secretHash(issued.token) }))
      .agencyIds
  ).toEqual([agency.id])
  const replacement = await replaceToken(db, actor, issued.id)
  expect(
    (
      await db
        .selectFrom('integration_token')
        .select('expiresAt')
        .where('id', '=', issued.id)
        .executeTakeFirst()
    )?.expiresAt
  ).toBeNull()
  await expect(
    requireGovernment(db, { kind: 'integration', tokenHash: secretHash(issued.token) })
  ).rejects.toMatchObject({ statusCode: 401 })
  expect(
    (await requireGovernment(db, { kind: 'integration', tokenHash: secretHash(replacement.token) }))
      .agencyIds
  ).toEqual([agency.id])
})

it('keeps existing expiring keys through the nullable-expiry migration', async () => {
  const old = new Kysely<Database>({ dialect: pgliteDialect('memory://') })
  try {
    await migrate(old, '014_organization_agency_identity')
    const administrator = await createAdministrator(old, {
      name: 'Migration administrator',
      email: 'migration@example.test',
      password: 'Admin-test-only-2026!'
    })
    const actor = { kind: 'administrator' as const, administratorId: administrator.id }
    const agency = (await createAgency(old, actor, names('Migration agency'))).agency
    const issued = await createToken(old, actor, {
      agencyId: agency.id,
      name: 'Existing connector',
      expiresInDays: 30
    })
    await migrate(old)
    const stored = await old
      .selectFrom('integration_token')
      .select('expiresAt')
      .where('id', '=', issued.id)
      .executeTakeFirstOrThrow()
    expect(stored.expiresAt?.toISOString()).toBe(issued.expiresAt?.toISOString())
    expect(
      (
        await createToken(old, actor, {
          agencyId: agency.id,
          name: 'Permanent',
          expiresInDays: null
        })
      ).expiresAt
    ).toBeNull()
  } finally {
    await old.destroy()
  }
})

it('revokes legacy staff credentials while preserving agencies and access deny markers', async () => {
  const old = new Kysely<Database>({ dialect: pgliteDialect('memory://') })
  try {
    await migrate(old, '005_applications_attachments')
    const now = new Date()
    const legacy = await old
      .insertInto('user')
      .values({
        name: 'Former staff',
        email: 'former@example.test',
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    await old
      .insertInto('government_user')
      .values({ userId: legacy.id, role: 'staff', active: true, createdAt: now })
      .execute()
    await old
      .insertInto('account')
      .values({
        userId: legacy.id,
        accountId: String(legacy.id),
        providerId: 'credential',
        password: 'old-hash',
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
    await old
      .insertInto('session')
      .values({
        userId: legacy.id,
        token: 'old-token',
        expiresAt: new Date(now.getTime() + 86400000),
        createdAt: now,
        updatedAt: now,
        ipAddress: null,
        userAgent: null
      })
      .execute()
    const agency = await old
      .insertInto('agency')
      .values({ ...names('Preserved agency'), createdAt: now })
      .returning('id')
      .executeTakeFirstOrThrow()
    await migrate(old)
    expect(await old.selectFrom('account').selectAll().execute()).toEqual([])
    expect(await old.selectFrom('session').selectAll().execute()).toEqual([])
    expect((await old.selectFrom('agency').select('id').executeTakeFirstOrThrow()).id).toBe(
      agency.id
    )
    await expect(requireOrganizationAccount(old, legacy.id)).rejects.toMatchObject({
      statusCode: 403
    })
  } finally {
    await old.destroy()
  }
})
