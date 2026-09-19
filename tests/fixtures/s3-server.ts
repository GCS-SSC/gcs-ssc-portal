import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'
// Disposable MinIO with a private bucket: browser tests exercise the actual S3 protocol.
const name = `portal-s3-test-${randomBytes(6).toString('hex')}`
const container = execFileSync(
  'docker',
  [
    'run',
    '--rm',
    '--detach',
    '--name',
    name,
    '--tmpfs',
    '/data',
    '--publish',
    '127.0.0.1:3199:9000',
    '--env',
    'MINIO_ROOT_USER=portal-test-only',
    '--env',
    'MINIO_ROOT_PASSWORD=portal-test-only-secret',
    'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e',
    'server',
    '/data'
  ],
  { encoding: 'utf8' }
).trim()
const cleanup = () => {
  try {
    execFileSync('docker', ['rm', '--force', container], { stdio: 'ignore' })
  } catch {
    /* Already stopped. */
  }
}
process.once('exit', cleanup)
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => process.exit())
const endpoint = 'http://127.0.0.1:3199'
let ready = false
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    if ((await fetch(`${endpoint}/minio/health/live`)).ok) {
      ready = true
      break
    }
  } catch {
    /* Starting. */
  }
  await delay(500)
}
if (!ready) throw new Error('Disposable S3 service failed to start')
const client = new S3Client({
  endpoint,
  region: 'ca-central-1',
  forcePathStyle: true,
  credentials: { accessKeyId: 'portal-test-only', secretAccessKey: 'portal-test-only-secret' }
})
await client.send(new CreateBucketCommand({ Bucket: 'portal-test' }))
client.destroy()
// Readiness is published only after the private bucket exists.
const server = Bun.serve({ hostname: '127.0.0.1', port: 3198, fetch: () => new Response('ready') })
process.once('exit', () => server.stop())
