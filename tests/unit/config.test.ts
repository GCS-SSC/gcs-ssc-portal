import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPortalOriginAllowed, portalConfig, portalTrustedOriginsForRequest } from '../../server/utils/config'
import { invitationInput, permissionsInput } from '../../shared/schemas/portal'
afterEach(() => vi.unstubAllEnvs())
describe('configuration and request rules', () => {
  it('bounds expiry days and rejects fractional values', () => {
    vi.stubEnv('INVITATION_EXPIRY_DAYS', '3')
    expect(portalConfig().days).toBe(3)
    for (const value of ['0', '-1', '1.5', '366', 'oops', '']) {
      vi.stubEnv('INVITATION_EXPIRY_DAYS', value)
      expect(() => portalConfig()).toThrow()
    }
  })
  it('requires secure explicit production configuration', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('BETTER_AUTH_SECRET', '')
    vi.stubEnv('AUTH_SECRET', '')
    expect(() => portalConfig()).toThrow()
    vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(32))
    vi.stubEnv('APP_URL', 'http://localhost:3000')
    expect(() => portalConfig()).toThrow()
    vi.stubEnv('APP_URL', 'https://portal.example.test')
    expect(portalConfig().appUrl).toBe('https://portal.example.test')
  })
  it('trusts equivalent loopback origins only in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('APP_URL', 'http://0.0.0.0:3002')
    vi.stubEnv(
      'BETTER_AUTH_TRUSTED_ORIGINS',
      'http://0.0.0.0:3002,http://localhost:3002,http://127.0.0.1:3002'
    )
    expect(portalConfig().trustedOrigins).toEqual(
      expect.arrayContaining(['http://localhost:3002', 'http://127.0.0.1:3002'])
    )
    expect(portalConfig().trustedOrigins).not.toContain('http://example.test:3002')
  })
  it('accepts a forwarded same-origin HTTPS request in development only', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('APP_URL', 'http://0.0.0.0:3002')
    const origin = 'https://3002.613868.xyz'
    const requestUrl = `${origin}/api/auth/sign-in/email`
    expect(isPortalOriginAllowed(origin, requestUrl)).toBe(true)
    expect(portalTrustedOriginsForRequest(new Request(requestUrl, { headers: { origin } })))
      .toContain(origin)
    expect(isPortalOriginAllowed('https://evil.example.test', requestUrl)).toBe(false)
    expect(isPortalOriginAllowed(`${origin}/`, requestUrl)).toBe(false)
    expect(isPortalOriginAllowed(origin, 'http://localhost:3002/api/auth/sign-in/email'))
      .toBe(false)
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'https://portal.example.test')
    vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(32))
    expect(isPortalOriginAllowed(origin, requestUrl)).toBe(false)
  })
  it('limits permissions to additive grants and normalizes addresses', () => {
    expect(invitationInput.parse({ email: 'Person@Example.test' }).email).toBe(
      'person@example.test'
    )
    expect(permissionsInput.safeParse({ permissions: ['admin'] }).success).toBe(false)
    expect(permissionsInput.safeParse({ permissions: ['user', 'user'] }).success).toBe(false)
    expect(permissionsInput.safeParse({ permissions: ['user', 'admin'] }).success).toBe(true)
  })
})
