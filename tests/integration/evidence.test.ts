import { afterAll, beforeAll, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import type { Database } from '../../server/db/schema'
import { createDatabase } from '../../server/utils/database'
import { evidencePath, listEvidence, recordRequestEvidence } from '../../server/utils/evidence'

let db: Kysely<Database>
beforeAll(async () => {
  db = await createDatabase({ url: process.env.PORTAL_TEST_DATABASE_URL })
})
afterAll(async () => {
  await db?.destroy()
})

it('records access outcomes and successful mutations without storing secret URL segments', async () => {
  expect(evidencePath('/api/invitations/private-secret/accept')).toBe('/api/invitations/:id/accept')
  const actor = { kind: 'administrator' as const, id: 17 }
  await recordRequestEvidence(db, {
    method: 'POST',
    path: '/api/admin/integration-tokens',
    status: 201,
    durationMs: 12,
    actor
  })
  await recordRequestEvidence(db, {
    method: 'GET',
    path: '/api/invitations/private-secret',
    status: 403,
    durationMs: 4
  })
  await recordRequestEvidence(db, {
    method: 'POST',
    path: '/api/admin/login',
    status: 401,
    durationMs: 8
  })
  const access = await listEvidence(db, 'access', 1, 2)
  expect(access.total).toBe(3)
  expect(access.items).toHaveLength(2)
  expect(access.items[0]).toMatchObject({ status: 401, actorKind: 'anonymous' })
  expect(access.items[1]).toMatchObject({ path: '/api/invitations/:id', status: 403 })
  const audit = await listEvidence(db, 'audit', 1, 25)
  expect(audit.total).toBe(1)
  expect(audit.items[0]).toMatchObject({
    actorKind: 'administrator',
    actorId: 17,
    operation: 'POST'
  })
  const first = audit.items[0]!
  const successful = (await listEvidence(db, 'access', 2, 2)).items[0]!
  expect(first.requestId).toBe(successful.requestId)
})
