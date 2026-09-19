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
  return {
    days,
    appUrl: appUrl.origin,
    secret: secret || 'development-only-change-this-secret-32-characters',
    production
  }
}
