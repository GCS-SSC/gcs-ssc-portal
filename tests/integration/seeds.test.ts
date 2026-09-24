import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { betterAuth } from 'better-auth'
import { hashPassword } from 'better-auth/crypto'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import type { Kysely } from 'kysely'
import pg from 'pg'
import { createDatabase } from '../../server/utils/database'
import type { Database } from '../../server/db/schema'
import { seedDemo } from '../../server/db/seed-migrations'
import { demoAccounts, demoPassword } from '../../server/db/seeds/001-demo'
import { simpleCredentialsMigration } from '../../server/db/seeds/002-simple-credentials'
import { administratorSeed } from '../../server/db/seeds/003-administrator'
import { startApplication } from '../../server/utils/applications'
import { organizationSets } from '../../server/utils/submission-sets'
import { checkResponse, mutateResponse, startResponse } from '../../server/utils/set-responses'
import { getOrganization } from '../../server/utils/portal'
let db: Kysely<Database>
beforeAll(async () => {
  const url = process.env.PORTAL_TEST_DATABASE_URL
  if (url) {
    if (!new URL(url).pathname.endsWith('_test'))
      throw new Error('Disposable test database required')
    const guard = new pg.Client({ connectionString: url })
    await guard.connect()
    try {
      if (
        (
          await guard.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1"
          )
        ).rowCount
      )
        throw new Error('Refusing a nonempty database')
    } finally {
      await guard.end()
    }
  }
  db = await createDatabase({ url })
})
afterAll(async () => {
  await db?.destroy()
})

it('rejects production before creating seed history or users', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('PORTAL_ENVIRONMENT', 'production')
  try {
    await expect(seedDemo(db)).rejects.toThrow('disabled in production')
  } finally {
    vi.unstubAllEnvs()
  }
  expect(await db.selectFrom('user').selectAll().execute()).toEqual([])
  expect(
    (await db.introspection.getTables()).some((table) => table.name === 'portal_demo_migration')
  ).toBe(false)
})

it('rolls back a conflicting email without adopting or modifying existing accounts', async () => {
  const now = new Date()
  await db
    .insertInto('user')
    .values({
      id: 'existing-user',
      name: 'Existing person',
      email: 'owner@portal.com',
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now
    })
    .execute()
  await expect(seedDemo(db)).rejects.toThrow()
  expect((await db.selectFrom('user').selectAll().execute()).map((user) => user.id)).toEqual([
    'existing-user'
  ])
  expect(await db.selectFrom('account').selectAll().execute()).toEqual([])
  await db.deleteFrom('user').where('id', '=', 'existing-user').execute()
})

it('creates usable credentials and scoped sample data once, preserving edits on rerun', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('PORTAL_ENVIRONMENT', 'demo')
  try {
    expect(await seedDemo(db)).toBe(true)
  } finally {
    vi.unstubAllEnvs()
  }
  const auth = betterAuth({
    database: kyselyAdapter(db, { type: 'postgres' }),
    baseURL: 'http://localhost:3000',
    secret: 'seed-integration-test-only-secret-0123456789',
    emailAndPassword: { enabled: true }
  })
  for (const name of demoAccounts.filter((name) => name !== 'root' && name !== 'staff')) {
    const result = await auth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
        body: JSON.stringify({ email: `${name}@portal.com`, password: demoPassword })
      })
    )
    expect(result.status).toBe(200)
    expect(result.headers.get('set-cookie')).toContain('session_token')
  }
  const oldPassword = await hashPassword('old-demo-password')
  for (const name of demoAccounts.filter((name) => name !== 'root' && name !== 'staff')) {
    const user = await db
      .selectFrom('user')
      .select('id')
      .where('email', '=', `${name}@portal.com`)
      .executeTakeFirstOrThrow()
    await db
      .updateTable('user')
      .set({ email: `${name}@demo.example.test` })
      .where('id', '=', user.id)
      .execute()
    await db
      .updateTable('account')
      .set({ password: oldPassword })
      .where('userId', '=', user.id)
      .execute()
  }
  await simpleCredentialsMigration.up(db as Kysely<unknown>)
  await administratorSeed.up(db as Kysely<unknown>)
  expect(await seedDemo(db)).toBe(false)
  for (const name of demoAccounts.filter((name) => name !== 'root' && name !== 'staff')) {
    const result = await auth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
        body: JSON.stringify({ email: `${name}@portal.com`, password: demoPassword })
      })
    )
    expect(result.status).toBe(200)
  }
  const org = await db.selectFrom('organization').selectAll().executeTakeFirstOrThrow()
  expect(org.id).toMatch(/^[0-9a-f-]{14}7[0-9a-f-]{21}$/)
  const owner = (await getOrganization(db, org.id, org.ownerId)).organization
  expect(owner.permissions).toContain('application:manager')
  const members = await db
    .selectFrom('membership as m')
    .innerJoin('user as u', 'u.id', 'm.userId')
    .select('u.email')
    .where('m.organizationId', '=', org.id)
    .orderBy('u.email')
    .execute()
  expect(members.map((member) => member.email)).toEqual([
    'contributor@portal.com',
    'owner@portal.com',
    'user@portal.com',
    'viewer@portal.com'
  ])
  const verifiedMembers = await db
    .selectFrom('user')
    .select('emailVerified')
    .where('email', 'in', members.map((member) => member.email))
    .execute()
  expect(verifiedMembers.every((member) => member.emailVerified)).toBe(true)
  const viewer = await db
    .selectFrom('user')
    .selectAll()
    .where('email', '=', 'viewer@portal.com')
    .executeTakeFirstOrThrow()
  expect((await getOrganization(db, org.id, viewer.id)).organization.permissions).toContain(
    'application:viewer'
  )
  const contributor = await db
    .selectFrom('user')
    .select('id')
    .where('email', '=', 'contributor@portal.com')
    .executeTakeFirstOrThrow()
  expect((await getOrganization(db, org.id, contributor.id)).organization.permissions)
    .toContain('application:contributor')
  const member = await db
    .selectFrom('user')
    .select('id')
    .where('email', '=', 'user@portal.com')
    .executeTakeFirstOrThrow()
  expect((await getOrganization(db, org.id, member.id)).organization.permissions).toEqual(['user'])
  const cases = await db.selectFrom('funding_case').selectAll().orderBy('agreementNumber').execute()
  expect(cases.map((item) => item.agreementNumber)).toEqual([
    'DEMO-001',
    'DEMO-002',
    'DEMO-003'
  ])
  expect(cases.every((item) => item.organizationId === org.id && item.config.budgetLines.length === 2))
    .toBe(true)
  const sets = (await organizationSets(db, org.id, org.ownerId)).sets
  expect(sets).toHaveLength(3)
  expect(sets.every((set) => set.published && set.caseId && set.items.length === 2)).toBe(true)
  expect((await startResponse(db, org.id, org.ownerId, sets[0]!.id, { locale: 'en' })).response.status)
    .toBe('draft')
  const call = await db.selectFrom('funding_call').selectAll().executeTakeFirstOrThrow()
  expect(call.published).toBe(true)
  expect(call.surveyId).toBeTruthy()
  await expect(startApplication(db, org.id, viewer.id, call.id, { locale: 'en' })).rejects.toThrow()
  const draft = await startApplication(db, org.id, org.ownerId, call.id, { locale: 'en' })
  expect(draft.response.status).toBe('draft')
  expect(draft.response.snapshot.items[0]!.survey!.title.fr).toBe('Demande de projet communautaire')
  const savedApplication = await mutateResponse(db, org.id, org.ownerId, draft.response.id, 'save', {
    expectedRevision: draft.response.revision,
    items: [{
      id: 'application',
      kind: 'survey',
      answers: {
        project_name: 'Neighbourhood food garden',
        project_summary: 'Build a shared food garden for local residents.',
        participants: '50'
      }
    }]
  })
  const review = await checkResponse(db, org.id, org.ownerId, draft.response.id, {
    expectedRevision: savedApplication.response.revision
  })
  const submittedApplication = await mutateResponse(db, org.id, org.ownerId, draft.response.id, 'submit', {
    expectedRevision: savedApplication.response.revision,
    balanceRevision: review.balanceRevision,
    warningsAcknowledged: true
  })
  expect(submittedApplication.response.status).toBe('submitted')
  expect(await db.selectFrom('administrator').select(['email']).execute()).toEqual([
    { email: 'admin@portal.com' }
  ])
  expect(await db.selectFrom('government_user').selectAll().execute()).toEqual([])
  await db
    .updateTable('organization')
    .set({ name: 'Edited demo organization' })
    .where('id', '=', org.id)
    .execute()
  const accounts = await db.selectFrom('account').selectAll().orderBy('id').execute()
  expect(await seedDemo(db)).toBe(false)
  expect((await db.selectFrom('organization').selectAll().executeTakeFirstOrThrow()).name).toBe(
    'Edited demo organization'
  )
  expect(await db.selectFrom('account').selectAll().orderBy('id').execute()).toEqual(accounts)
  expect(await db.selectFrom('user').selectAll().execute()).toHaveLength(demoAccounts.length - 2)
})
