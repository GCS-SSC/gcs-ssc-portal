import { betterAuth } from 'better-auth'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import { useDatabase } from './database'
import { isPortalOriginAllowed, portalConfig, portalTrustedOriginsForRequest } from './config'
import { INTERNAL_IP_HEADER } from './client-ip'
import { readBoundedBody } from './request-body'
const createAuth = async () => {
  const config = portalConfig()
  return betterAuth({
    database: kyselyAdapter(await useDatabase(), { type: 'postgres' }),
    secret: config.secret,
    baseURL: config.appUrl,
    trustedOrigins: (request) => portalTrustedOriginsForRequest(request),
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7 },
    rateLimit: { enabled: true, window: 60, max: 60 },
    advanced: {
      useSecureCookies: config.production,
      ipAddress: { ipAddressHeaders: [INTERNAL_IP_HEADER] }
    }
  })
}
let instance: ReturnType<typeof createAuth> | undefined
export const useAuth = () => (instance ??= createAuth())

/** Enforce origin on every auth mutation, including initially cookieless sign-up. */
export const handleAuthRequest = async (request: Request) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    (!isPortalOriginAllowed(request.headers.get('origin'), request.url) ||
      request.headers.get('sec-fetch-site') === 'cross-site')
  ) {
    void request.body?.cancel().catch(() => undefined)
    return Response.json({ code: 'ORIGIN_FORBIDDEN', message: 'ORIGIN_FORBIDDEN' }, { status: 403 })
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    try {
      const body = await readBoundedBody(request)
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: body as BodyInit | undefined
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 413)
        return Response.json(
          { code: 'REQUEST_TOO_LARGE', message: 'REQUEST_TOO_LARGE' },
          { status: 413 }
        )
      throw error
    }
  }
  return (await useAuth()).handler(request)
}
