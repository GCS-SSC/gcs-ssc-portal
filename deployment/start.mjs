import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const mode = readFileSync(new URL('./environment', import.meta.url), 'utf8').trim()
if (!['demo', 'production'].includes(mode)) throw new Error('Invalid image environment')
if (process.env.PORTAL_ENVIRONMENT && process.env.PORTAL_ENVIRONMENT !== mode)
  throw new Error('PORTAL_ENVIRONMENT must match the image build; rebuild to change modes')
process.env.PORTAL_ENVIRONMENT = mode
if (!process.env.APP_URL && process.env.RAILWAY_PUBLIC_DOMAIN)
  process.env.APP_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
for (const script of mode === 'demo' ? ['migrate', 'seed-demo'] : ['migrate']) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(`./server/${script}.mjs`, import.meta.url))],
    { stdio: 'inherit', env: process.env }
  )
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
await import('./server/index.mjs')
