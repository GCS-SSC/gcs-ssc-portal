import handler from '../../server/api/government/[...path]'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
vi.mock('../../server/utils/database', () => ({ useDatabase: async () => ({}) }))
vi.mock('../../server/utils/government-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/utils/government-access')>()
  return { ...actual, requireGovernment: async () => ({ role: 'integration', agencyIds: [] }) }
})
let server: Server
let origin: string
beforeAll(async () => {
  server = createServer(toNodeListener(createApp().use(handler)))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test address')
  origin = `http://127.0.0.1:${address.port}`
})
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
})
it('rejects cookie-only government requests', async () => {
  const response = await fetch(`${origin}/api/government/agencies`, {
    headers: { Cookie: 'better-auth.session_token=old-staff' }
  })
  expect(response.status).toBe(401)
})
it('removes staff management from the machine API', async () => {
  const response = await fetch(`${origin}/api/government/staff`, {
    headers: { Authorization: `Bearer gcs_${'A'.repeat(43)}` }
  })
  expect(response.status).toBe(404)
})
