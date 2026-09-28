import { expect, it } from 'vitest'
import { imageManifestSchema } from '../../deployment/demo-images'
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
