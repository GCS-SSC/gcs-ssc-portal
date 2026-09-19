import { afterEach, describe, expect, it, vi } from 'vitest'
import { portalConfig } from '../../server/utils/config'
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
  it('limits permissions to additive grants and normalizes addresses', () => {
    expect(invitationInput.parse({ email: 'Person@Example.test' }).email).toBe(
      'person@example.test'
    )
    expect(permissionsInput.safeParse({ permissions: ['admin'] }).success).toBe(false)
    expect(permissionsInput.safeParse({ permissions: ['user', 'user'] }).success).toBe(false)
    expect(permissionsInput.safeParse({ permissions: ['user', 'admin'] }).success).toBe(true)
  })
})
