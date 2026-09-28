import { describe, expect, it } from 'vitest'
import { prepareAwsPortalEnvironment } from '../../deployment/aws-start.mjs'

describe('AWS Portal startup', () => {
  it('requires RDS credentials and verifies its hostname with the regional CA', () => {
    const environment = {
      AWS_DB_HOST: 'portal.ca-central-1.rds.amazonaws.com',
      AWS_DB_USER: 'portal',
      AWS_DB_PASSWORD: 'p@ss:/?#%word'
    } as NodeJS.ProcessEnv
    prepareAwsPortalEnvironment(environment)
    const url = new URL(environment.DATABASE_URL!)
    expect(decodeURIComponent(url.password)).toBe('p@ss:/?#%word')
    expect(url.hostname).toBe('portal.ca-central-1.rds.amazonaws.com')
    expect(url.pathname).toBe('/portal')
    expect(url.searchParams.get('sslmode')).toBe('verify-full')
    expect(url.searchParams.get('sslrootcert')).toBe('/app/.output/rds-ca.pem')
    expect(environment.AWS_DB_PASSWORD).toBeUndefined()

    for (const name of ['AWS_DB_HOST', 'AWS_DB_USER', 'AWS_DB_PASSWORD']) {
      const missing = {
        AWS_DB_HOST: 'portal.ca-central-1.rds.amazonaws.com',
        AWS_DB_USER: 'portal',
        AWS_DB_PASSWORD: 'secret'
      } as NodeJS.ProcessEnv
      Reflect.deleteProperty(missing, name)
      expect(() => prepareAwsPortalEnvironment(missing)).toThrow(name)
      expect(missing.DATABASE_URL).toBeUndefined()
    }
  })
})
