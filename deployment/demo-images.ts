import { readFileSync } from 'node:fs'
import { z } from 'zod'
export const imageManifestSchema = z
  .object({
    theme: z.enum(['nuxtui', 'gcdesign']),
    images: z
      .object({
        nuxtui: z
          .string()
          .regex(/^ghcr\.io\/gcs-ssc\/gcs-ssc-portal-demo-nuxtui@sha256:[a-f0-9]{64}$/)
          .nullable(),
        gcdesign: z
          .string()
          .regex(/^ghcr\.io\/gcs-ssc\/gcs-ssc-portal-demo-gcdesign@sha256:[a-f0-9]{64}$/)
          .nullable()
      })
      .strict()
  })
  .strict()
export const readDemoImage = () => {
  const manifest = imageManifestSchema.parse(
    JSON.parse(readFileSync(new URL('./demo-images.json', import.meta.url), 'utf8'))
  )
  const image = manifest.images[manifest.theme]
  if (!image)
    throw new Error(
      'Promote a GitHub image digest into deployment/demo-images.json before planning Railway'
    )
  return image
}
