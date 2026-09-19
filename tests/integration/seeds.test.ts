import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { betterAuth } from 'better-auth'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import type { Kysely } from 'kysely'
import pg from 'pg'
import { createDatabase } from '../../server/utils/database'
import type { Database } from '../../server/db/schema'
import { seedDemo } from '../../server/db/seed-migrations'
import { demoAccounts, demoPassword } from '../../server/db/seeds/001-demo'
import { startApplication } from '../../server/utils/applications'
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
      email: 'staff@demo.example.test',
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
  expect(await seedDemo(db)).toBe(true)
  const auth = betterAuth({
    database: kyselyAdapter(db, { type: 'postgres' }),
    baseURL: 'http://localhost:3000',
    secret: 'seed-integration-test-only-secret-0123456789',
    emailAndPassword: { enabled: true }
  })
  for (const name of demoAccounts) {
    const result = await auth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
        body: JSON.stringify({ email: `${name}@demo.example.test`, password: demoPassword })
      })
    )
    expect(result.status).toBe(200)
    expect(result.headers.get('set-cookie')).toContain('session_token')
  }
  const org = await db.selectFrom('organization').selectAll().executeTakeFirstOrThrow()
  expect(org.id).toMatch(/^[0-9a-f-]{14}7[0-9a-f-]{21}$/)
  const owner = (await getOrganization(db, org.id, org.ownerId)).organization
  expect(owner.permissions).toContain('application:manager')
  const viewer = await db
    .selectFrom('user')
    .selectAll()
    .where('email', '=', 'viewer@demo.example.test')
    .executeTakeFirstOrThrow()
  expect((await getOrganization(db, org.id, viewer.id)).organization.permissions).toContain(
    'application:viewer'
  )
  const call = await db.selectFrom('funding_call').selectAll().executeTakeFirstOrThrow()
  await expect(startApplication(db, org.id, viewer.id, call.id, { locale: 'en' })).rejects.toThrow()
  const draft = await startApplication(db, org.id, org.ownerId, call.id, { locale: 'en' })
  expect(draft.response.status).toBe('draft')
  expect(draft.response.snapshot.items[0]!.survey!.title.fr).toBe('Demande de projet communautaire')
  const staff = await db
    .selectFrom('government_user')
    .selectAll()
    .where('role', '=', 'staff')
    .executeTakeFirstOrThrow()
  expect(
    await db.selectFrom('membership').selectAll().where('userId', '=', staff.userId).execute()
  ).toEqual([])
  expect(
    await db.selectFrom('agency_staff').selectAll().where('userId', '=', staff.userId).execute()
  ).toHaveLength(1)
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
  expect(await db.selectFrom('user').selectAll().execute()).toHaveLength(demoAccounts.length)
})
