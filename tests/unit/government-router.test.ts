import handler from '../../server/api/government/[...path]'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
const mocks = vi.hoisted(() => ({
  changeStaff: vi.fn(async () => ({ success: true })),
  origin: ''
}))
vi.mock('../../server/utils/database', () => ({ useDatabase: async () => ({}) }))
vi.mock('../../server/utils/auth', () => ({
  useAuth: async () => ({ api: { getSession: async () => ({ user: { id: 'root' } }) } })
}))
vi.mock('../../server/utils/config', () => ({ portalConfig: () => ({ appUrl: mocks.origin }) }))
vi.mock('../../server/utils/government-admin', () => ({ changeStaff: mocks.changeStaff }))
vi.mock('../../server/utils/government-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/utils/government-access')>()
  return { ...actual, requireGovernment: async () => ({ role: 'root', agencyIds: [] }) }
})
let server: Server
beforeAll(async () => {
  server = createServer(toNodeListener(createApp().use(handler)))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test address')
  mocks.origin = `http://127.0.0.1:${address.port}`
})
beforeEach(() => mocks.changeStaff.mockClear())
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
})
it('preserves opaque identity characters through both staff mutation routes', async () => {
  const id = 'staff / français % # ?'
  for (const action of ['access', 'status']) {
    const body = action === 'access' ? { agencyIds: [] } : { active: false }
    const response = await fetch(
      `${mocks.origin}/api/government/staff/${encodeURIComponent(id)}/${action}`,
      {
        method: 'PATCH',
        headers: { Origin: mocks.origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
    expect(response.status).toBe(200)
    expect(mocks.changeStaff).toHaveBeenLastCalledWith(
      {},
      { kind: 'user', userId: 'root' },
      id,
      body,
      action
    )
  }
})
it('rejects malformed percent escapes without dispatching a staff mutation', async () => {
  const response = await fetch(`${mocks.origin}/api/government/staff/%GG/status`, {
    method: 'PATCH',
    headers: { Origin: mocks.origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: false })
  })
  expect(response.status).toBe(400)
  expect(mocks.changeStaff).not.toHaveBeenCalled()
})
