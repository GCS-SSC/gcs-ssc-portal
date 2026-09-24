import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { handleAuthRequest, useAuth } from '../../server/utils/auth'
import { useDatabase } from '../../server/utils/database'
beforeAll(() => {
  vi.stubEnv('PGLITE_DATA_DIR', 'memory://')
  vi.stubEnv('APP_URL', 'http://localhost:3000')
  vi.stubEnv(
    'BETTER_AUTH_TRUSTED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000'
  )
})
afterAll(async () => {
  await (await useDatabase()).destroy()
  vi.unstubAllEnvs()
})
const request = async (route: string, body: unknown, origin = 'http://localhost:3000') =>
  handleAuthRequest(
    new Request(`http://localhost:3000/api/auth/${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify(body)
    })
  )
describe('real Better Auth boundary', () => {
  it('registers, hashes password, signs in, resolves cookie session, and rejects cross-origin signups', async () => {
    const input = {
      name: 'Test person',
      email: 'test-person@example.test',
      password: 'password123'
    }
    const response = await request('sign-up/email', input)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.user.email).toBe(input.email)
    const db = await useDatabase()
    const account = await db
      .selectFrom('account')
      .select('password')
      .where('userId', '=', body.user.id)
      .executeTakeFirstOrThrow()
    expect(account.password).toBeTruthy()
    expect(account.password).not.toContain(input.password)
    const signIn = await request('sign-in/email', { email: input.email, password: input.password })
    expect(signIn.status).toBe(200)
    const cookie = signIn.headers.get('set-cookie')?.split(';')[0]
    expect(cookie).toBeTruthy()
    const session = await (
      await useAuth()
    ).api.getSession({ headers: new Headers({ cookie: cookie! }) })
    expect(session?.user.id).toBe(body.user.id)
    expect(
      (await request('sign-in/email', { email: input.email, password: 'wrong-password' })).status
    ).toBe(401)
    expect(
      (
        await request(
          'sign-up/email',
          { name: 'Loopback', email: 'loopback@example.test', password: 'password123' },
          'http://127.0.0.1:3000'
        )
      ).status
    ).toBe(200)
    expect(
      (
        await request(
          'sign-up/email',
          { ...input, email: 'other@example.test' },
          'https://evil.example.test'
        )
      ).status
    ).toBe(403)
  }, 60000)
  it('rejects oversized chunked auth bodies before account processing', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(16385))
        controller.close()
      }
    })
    const response = await handleAuthRequest(
      new Request('http://localhost:3000/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'content-length': '1'
        },
        body: stream,
        duplex: 'half'
      } as RequestInit)
    )
    expect(response.status).toBe(413)
    expect((await response.json()).code).toBe('REQUEST_TOO_LARGE')
  })
  it('accepts a same-origin forwarded HTTPS login in development', async () => {
    const origin = 'https://3002.613868.xyz'
    const response = await handleAuthRequest(new Request(`${origin}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test-person@example.test', password: 'password123' })
    }))
    expect(response.status).toBe(200)
  })
  it('rejects weak passwords and duplicate emails', async () => {
    expect(
      (
        await request('sign-up/email', {
          name: 'Weak',
          email: 'weak@example.test',
          password: 'short'
        })
      ).status
    ).toBe(400)
    expect(
      (
        await request('sign-up/email', {
          name: 'Duplicate',
          email: 'test-person@example.test',
          password: 'another-strong-password'
        })
      ).ok
    ).toBe(false)
  })
})
