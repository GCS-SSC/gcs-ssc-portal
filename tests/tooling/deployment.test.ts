import { afterEach, expect, it, vi } from 'vitest'
import { createRailwayContext, project } from 'railway/iac'
import config from '../../.railway/railway'
import { imageManifestSchema } from '../../deployment/demo-images'
vi.mock('../../deployment/demo-images', async () => ({
  ...(await vi.importActual<typeof import('../../deployment/demo-images')>(
    '../../deployment/demo-images'
  )),
  readDemoImage: () => `ghcr.io/gcs-ssc/gcs-ssc-portal-demo-gcdesign@sha256:${'a'.repeat(64)}`
}))
afterEach(() => vi.unstubAllEnvs())
it('rejects mutable tags and images from the wrong repository', () => {
  const valid = `ghcr.io/gcs-ssc/gcs-ssc-portal-demo-gcdesign@sha256:${'a'.repeat(64)}`
  const input = { image: valid }
  expect(imageManifestSchema.parse(input)).toEqual(input)
  for (const image of [
    valid.replace(/@sha256:.+/, ':latest'),
    valid.replace('gcs-ssc/', 'other/'),
    valid.replace('gcdesign', 'unsupported')
  ])
    expect(imageManifestSchema.safeParse({ image }).success).toBe(false)
})
it('targets only the separate demo with pinned source, PostgreSQL and secret references', async () => {
  vi.stubEnv('PORTAL_GHCR_USERNAME', 'registry-user')
  vi.stubEnv('PORTAL_GHCR_TOKEN', 'test-only-token')
  const result = await config(
    createRailwayContext({ projectName: 'GCS Portal Demo', environment: 'demo' }),
    project
  )
  const resources = result.resources!.flat()
  const app = resources.find((resource) => resource.type === 'service')
  expect(app?.type).toBe('service')
  if (app?.type !== 'service') throw new Error('App service missing')
  expect(app.source?.image).toMatch(/@sha256:[a-f0-9]{64}$/)
  expect(app.source?.repo).toBeUndefined()
  expect(app.source?.autoUpdates?.type).toBe('disabled')
  expect(app.variables?.DATABASE_URL).toMatchObject({
    type: 'reference',
    resource: 'database.Postgres',
    output: 'DATABASE_URL'
  })
  expect(app.variables?.BETTER_AUTH_SECRET).toEqual({
    type: 'sharedReference',
    name: 'PORTAL_AUTH_SECRET'
  })
  expect(app.deploy?.healthcheckPath).toBe('/api/session')
  expect(() =>
    config(createRailwayContext({ projectName: 'GCS Demo', environment: 'demo' }), project)
  ).toThrow('separate')
  expect(() =>
    config(
      createRailwayContext({ projectName: 'GCS Portal Demo', environment: 'production' }),
      project
    )
  ).toThrow('separate')
})
