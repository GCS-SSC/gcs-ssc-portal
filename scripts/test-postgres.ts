import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

// Every resource is unique to this run. No caller-provided database is contacted.
const name = `gcs-portal-test-${randomBytes(6).toString('hex')}`
const password = randomBytes(24).toString('hex')
const database = 'portal_integration_test'
let container: string | undefined
let exitCode: number
try {
  container = execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '--detach',
      '--name',
      name,
      '--tmpfs',
      '/var/lib/postgresql/data',
      '--publish',
      '127.0.0.1::5432',
      '--env',
      `POSTGRES_PASSWORD=${password}`,
      '--env',
      `POSTGRES_DB=${database}`,
      'postgres:17-alpine'
    ],
    { encoding: 'utf8' }
  ).trim()
  const port = execFileSync('docker', ['port', container, '5432/tcp'], { encoding: 'utf8' })
    .trim()
    .split(':')
    .at(-1)
  let ready = false
  for (let attempt = 0; attempt < 120; attempt++) {
    const probe = spawnSync(
      'docker',
      ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', database],
      { stdio: 'ignore' }
    )
    if (probe.status === 0) {
      ready = true
      break
    }
    await delay(500)
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready in 60 seconds')
  console.log(
    'Running portal lifecycle, migrations, authorization, and concurrency tests against disposable PostgreSQL 17.'
  )
  exitCode = 0
  for (const suite of ['portal', 'government', 'surveys', 'agreements', 'applications', 'seeds']) {
    const suiteDatabase = `${suite}_test`
    execFileSync('docker', ['exec', container, 'createdb', '-U', 'postgres', suiteDatabase])
    const result = spawnSync('bun', ['x', 'vitest', 'run', `tests/integration/${suite}.test.ts`], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORTAL_TEST_DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/${suiteDatabase}`
      }
    })
    exitCode ||= result.status ?? 1
  }
} finally {
  if (container) execFileSync('docker', ['rm', '--force', container], { stdio: 'ignore' })
}
process.exitCode = exitCode
