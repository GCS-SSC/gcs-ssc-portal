export const portalConfig = () => {
  const days = Number(process.env.INVITATION_EXPIRY_DAYS ?? 7)
  if (!Number.isInteger(days) || days < 1 || days > 365)
    throw new Error('INVITATION_EXPIRY_DAYS must be an integer between 1 and 365')
  const appUrl = new URL(process.env.APP_URL || 'http://localhost:3000')
  if (
    !['http:', 'https:'].includes(appUrl.protocol) ||
    appUrl.pathname !== '/' ||
    appUrl.search ||
    appUrl.hash ||
    appUrl.username ||
    appUrl.password
  )
    throw new Error('APP_URL must be an HTTP(S) origin')
  const production = process.env.NODE_ENV === 'production'
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET
  if (production && (!secret || secret.length < 32))
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters in production')
  if (production && (!process.env.APP_URL || appUrl.protocol !== 'https:'))
    throw new Error('APP_URL must be an explicit HTTPS origin in production')
  const trustedOrigins = [
    appUrl.origin,
    ...(!production
      ? (process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean) ?? [])
      : [])
  ]
  return {
    days,
    appUrl: appUrl.origin,
    trustedOrigins: [...new Set(trustedOrigins)],
    secret: secret || 'development-only-change-this-secret-32-characters',
    production
  }
}

/** Accept the browser's own request origin during development, including HTTPS forwarding URLs. */
export const isPortalOriginAllowed = (origin: string | null, requestUrl?: string): boolean => {
  if (!origin) return false
  const config = portalConfig()
  if (config.trustedOrigins.includes(origin)) return true
  if (config.production || !requestUrl) return false
  try {
    const parsedOrigin = new URL(origin)
    const parsedRequest = new URL(requestUrl)
    return ['http:', 'https:'].includes(parsedOrigin.protocol) &&
      origin === parsedOrigin.origin &&
      parsedOrigin.origin === parsedRequest.origin
  } catch {
    return false
  }
}

export const portalTrustedOriginsForRequest = (request?: Request): string[] => {
  const origins = portalConfig().trustedOrigins
  const origin = request?.headers.get('origin')
  return origin && isPortalOriginAllowed(origin, request?.url) && !origins.includes(origin)
    ? [...origins, origin]
    : origins
}
