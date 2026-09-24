import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { imageManifestSchema } from '../deployment/demo-images'

const directory = process.argv[2]
if (!directory || process.argv.length !== 3)
  throw new Error('Usage: bun scripts/promote-images.ts <download-directory>')
const release = imageManifestSchema
  .extend({
    commit: z.string().regex(/^[a-f0-9]{40}$/)
  })
  .parse(
    JSON.parse(readFileSync(resolve(directory, 'image-gcdesign', 'image-gcdesign.json'), 'utf8'))
  )
const manifest = imageManifestSchema.parse({ image: release.image })
writeFileSync(
  new URL('../deployment/demo-images.json', import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`
)
console.log(
  `Pinned GC Design System image from ${release.commit}. No Railway operation was performed.`
)
