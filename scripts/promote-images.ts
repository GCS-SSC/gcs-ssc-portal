import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { imageManifestSchema } from '../deployment/demo-images'

const directory = process.argv[2]
const theme = process.argv[3] ?? 'nuxtui'
if (!directory)
  throw new Error('Usage: bun scripts/promote-images.ts <download-directory> [nuxtui|gcdesign]')
const release = (name: string) =>
  JSON.parse(readFileSync(resolve(directory, `image-${name}`, `image-${name}.json`), 'utf8'))
const nuxtui = release('nuxtui'),
  gcdesign = release('gcdesign')
if (
  nuxtui.theme !== 'nuxtui' ||
  gcdesign.theme !== 'gcdesign' ||
  !/^[a-f0-9]{40}$/.test(nuxtui.commit) ||
  nuxtui.commit !== gcdesign.commit
)
  throw new Error(
    'Both image artifacts must be from the same source commit and the expected themes'
  )
const manifest = imageManifestSchema.parse({
  theme,
  images: { nuxtui: nuxtui.image, gcdesign: gcdesign.image }
})
if (!manifest.images.nuxtui || !manifest.images.gcdesign)
  throw new Error('Both verified image digests are required for promotion')
writeFileSync(
  new URL('../deployment/demo-images.json', import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`
)
console.log(
  `Pinned both images from ${nuxtui.commit}; selected theme: ${manifest.theme}. No Railway operation was performed.`
)
