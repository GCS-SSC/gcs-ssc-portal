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
  const remaining = await listEvidence(db, 'access', 2, 2)
  const accessItems = [...access.items, ...remaining.items]
  expect(remaining.items).toHaveLength(1)
  expect(new Set(accessItems.map((item) => item.id)).size).toBe(3)
  expect(accessItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ status: 401, actorKind: 'anonymous' }),
      expect.objectContaining({ path: '/api/invitations/:id', status: 403 })
    ])
  )
  const audit = await listEvidence(db, 'audit', 1, 25)
  expect(audit.total).toBe(1)
  expect(audit.items[0]).toMatchObject({
    actorKind: 'administrator',
    actorId: 17,
    operation: 'POST'
  })
  const first = audit.items[0]!
  const successful = accessItems.find((item) => item.status === 201)!
  expect(first.requestId).toBe(successful.requestId)
})
