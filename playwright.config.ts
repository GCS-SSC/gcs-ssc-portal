import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { defineConfig } from '@playwright/test'

const dataDirectory = mkdtempSync(join(tmpdir(), 'gcs-portal-e2e-'))
process.once('exit', () => rmSync(dataDirectory, { recursive: true, force: true }))
const certificatePath = join(dataDirectory, 'localhost.crt')
const keyPath = join(dataDirectory, 'localhost.key')
execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    keyPath,
    '-out',
    certificatePath,
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=IP:127.0.0.1'
  ],
  { stdio: 'ignore' }
)
const baseURL = 'https://127.0.0.1:3100'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    browserName: 'chromium',
    extraHTTPHeaders: { Origin: baseURL },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'bun tests/fixtures/s3-server.ts',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
      url: 'http://127.0.0.1:3198',
      timeout: 60000,
      reuseExistingServer: false
    },
    {
      command: 'bun scripts/create-administrator.ts && node .output/server/index.mjs',
      url: `${baseURL}/api/session`,
      timeout: 60_000,
      reuseExistingServer: false,
      ignoreHTTPSErrors: true,
      env: {
        NODE_ENV: 'production',
        S3_BUCKET: 'portal-test',
        S3_REGION: 'ca-central-1',
        S3_ENDPOINT: 'http://127.0.0.1:3199',
        S3_FORCE_PATH_STYLE: 'true',
        AWS_ACCESS_KEY_ID: 'portal-test-only',
        AWS_SECRET_ACCESS_KEY: 'portal-test-only-secret',
        ADMIN_NAME: 'Portal Root',
        ADMIN_EMAIL: 'root@example.test',
        ADMIN_PASSWORD: 'Root-test-only-2026!',
        NITRO_SSL_CERT: readFileSync(certificatePath, 'utf8'),
        NITRO_SSL_KEY: readFileSync(keyPath, 'utf8'),
        APP_URL: baseURL,
        PORT: '3100',
        HOST: '127.0.0.1',
        DATABASE_URL: '',
        PGLITE_DATA_DIR: join(dataDirectory, 'database'),
        BETTER_AUTH_SECRET: 'e2e-only-not-a-production-secret-0123456789',
        INVITATION_EXPIRY_DAYS: '3'
      }
    }
  ]
})
