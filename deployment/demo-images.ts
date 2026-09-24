import { readFileSync } from 'node:fs'
import { z } from 'zod'

export const imageManifestSchema = z
  .object({
    image: z.string().regex(/^ghcr\.io\/gcs-ssc\/gcs-ssc-portal-demo-gcdesign@sha256:[a-f0-9]{64}$/)
  })
  .strict()

export const readDemoImage = () =>
  imageManifestSchema.parse(
    JSON.parse(readFileSync(new URL('./demo-images.json', import.meta.url), 'utf8'))
  ).image
