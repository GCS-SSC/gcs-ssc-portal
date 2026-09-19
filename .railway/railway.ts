import { defineRailway, image, postgres, project, service } from 'railway/iac'
import { readDemoImage } from '../deployment/demo-images'

export default defineRailway((ctx) => {
  if (ctx.projectName !== 'GCS Portal Demo' || ctx.environment !== 'demo')
    throw new Error('Use the separate GCS Portal Demo project and demo environment')
  const username = process.env.PORTAL_GHCR_USERNAME
  const password = process.env.PORTAL_GHCR_TOKEN
  if (!username || !password)
    throw new Error(
      'Supply PORTAL_GHCR_USERNAME and PORTAL_GHCR_TOKEN for the private image registry'
    )
  const database = postgres('Postgres')
  const portal = service('gcs-ssc-portal', {
    source: image(readDemoImage(), { autoUpdates: { type: 'disabled' } }),
    replicas: 1,
    deploy: {
      healthcheckPath: '/api/session',
      healthcheckTimeout: 300,
      registryCredentials: { username, password }
    },
    env: {
      DATABASE_URL: database.env.DATABASE_URL,
      BETTER_AUTH_SECRET: ctx.shared.PORTAL_AUTH_SECRET,
      PORTAL_ENVIRONMENT: 'demo',
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '3000'
    }
  })
  return project('GCS Portal Demo', { resources: [database, portal] })
})
