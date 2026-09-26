import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { attachmentStorage, sha256 } from '../../server/utils/attachment-storage'
import { attachmentConfig } from '../../server/utils/attachment-config'

const previousBucket = process.env.S3_BUCKET
const previousDirectory = process.env.ATTACHMENT_LOCAL_DIR
let directory: string | undefined

afterEach(async () => {
  if (previousBucket === undefined) delete process.env.S3_BUCKET
  else process.env.S3_BUCKET = previousBucket
  if (previousDirectory === undefined) delete process.env.ATTACHMENT_LOCAL_DIR
  else process.env.ATTACHMENT_LOCAL_DIR = previousDirectory
  if (directory) await rm(directory, { recursive: true, force: true })
  directory = undefined
})

it('stores private local files without S3 and keeps them readable when S3 is configured later', async () => {
  directory = await mkdtemp(join(tmpdir(), 'portal-attachments-'))
  process.env.ATTACHMENT_LOCAL_DIR = join(directory, 'private')
  delete process.env.S3_BUCKET
  expect(attachmentConfig().configured).toBe(true)
  const storage = attachmentStorage()
  const location = storage.location('0123456789abcdef0123456789abcdef')
  const bytes = new TextEncoder().encode('local supporting evidence')
  await storage.put(location, bytes)
  expect((await stat(join(directory, 'private'))).mode & 0o777).toBe(0o700)
  expect((await stat(join(directory, 'private', location.objectKey))).mode & 0o777).toBe(0o600)
  expect(await readFile(join(directory, 'private', location.objectKey))).toEqual(Buffer.from(bytes))
  await expect(storage.put(location, bytes)).rejects.toMatchObject({ code: 'EEXIST' })
  await expect(storage.get(location, bytes.length, 'wrong-checksum')).rejects.toMatchObject({
    statusCode: 502
  })
  process.env.S3_BUCKET = 'future-private-bucket'
  expect(await attachmentStorage().get(location, bytes.length, sha256(bytes))).toEqual(bytes)
  await attachmentStorage().remove(location)
  await attachmentStorage().remove(location)
  await expect(
    attachmentStorage().get(location, bytes.length, sha256(bytes))
  ).rejects.toMatchObject({ code: 'ENOENT' })
})

it('rejects local object keys that could escape the private directory', async () => {
  directory = await mkdtemp(join(tmpdir(), 'portal-attachments-'))
  process.env.ATTACHMENT_LOCAL_DIR = directory
  delete process.env.S3_BUCKET
  await expect(
    attachmentStorage().get({ bucket: '!portal-local', objectKey: '../escape' }, 1, 'x')
  ).rejects.toMatchObject({ statusCode: 502 })
})
