import { pathToFileURL } from 'node:url'

export const prepareAwsPortalEnvironment = (environment) => {
  for (const name of ['AWS_DB_HOST', 'AWS_DB_USER', 'AWS_DB_PASSWORD']) {
    if (!environment[name]) throw new Error(`Missing required AWS runtime input: ${name}`)
  }
  const url = new URL('postgresql://localhost:5432/portal')
  url.hostname = environment.AWS_DB_HOST
  url.username = encodeURIComponent(environment.AWS_DB_USER)
  url.password = encodeURIComponent(environment.AWS_DB_PASSWORD)
  url.searchParams.set('sslmode', 'verify-full')
  url.searchParams.set('sslrootcert', '/app/.output/rds-ca.pem')
  environment.DATABASE_URL = url.toString()
  delete environment.AWS_DB_PASSWORD
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareAwsPortalEnvironment(process.env)
  await import('./start.mjs')
}
