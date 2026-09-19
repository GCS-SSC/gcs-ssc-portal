import { createServer, request as httpRequest } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createApp, defineEventHandler, toNodeListener } from 'h3'
import { readBoundedBody, toBoundedRequest } from '../../server/utils/request-body'
import { INTERNAL_IP_HEADER, withSocketClientIp } from '../../server/utils/client-ip'
const app = createApp().use(
  defineEventHandler(async (event) => {
    const request = withSocketClientIp(event, toBoundedRequest(event))
    return {
      bytes: (await readBoundedBody(request))?.byteLength ?? 0,
      clientIp: request.headers.get(INTERNAL_IP_HEADER)
    }
  })
)
const server = createServer(toNodeListener(app))
let port: number
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
})
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
})
const send = (chunks: string[], headers: Record<string, string> = {}) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = httpRequest(
      { host: '127.0.0.1', port, method: 'POST', path: '/', headers },
      (response) => {
        let body = ''
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => resolve({ status: response.statusCode!, body }))
      }
    )
    request.on('error', reject)
    for (const chunk of chunks) request.write(chunk)
    request.end()
  })
it('returns 413 for an actual chunked HTTP upload and still serves subsequent requests', async () => {
  const rejected = await send(['a'.repeat(8192), 'b'.repeat(8192), 'c'.repeat(8192)])
  expect(rejected.status).toBe(413)
  expect(rejected.body).toContain('REQUEST_TOO_LARGE')
  const accepted = await send(['hello'])
  expect(accepted.status).toBe(200)
  expect(JSON.parse(accepted.body)).toEqual({ bytes: 5, clientIp: '127.0.0.1' })
})

it('overwrites spoofed internal and forwarding headers with the socket peer', async () => {
  const response = await send(['hello'], {
    'x-portal-client-ip': '203.0.113.5',
    'x-forwarded-for': '203.0.113.6',
    'x-real-ip': '203.0.113.7'
  })
  expect(response.status).toBe(200)
  expect(JSON.parse(response.body).clientIp).toBe('127.0.0.1')
})
