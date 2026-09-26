import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { mkdir, open, unlink } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { governmentFail as fail } from './government-access'
import { readBoundedBody } from './request-body'
export interface ObjectLocation {
  bucket: string
  objectKey: string
}
export interface AttachmentStorage {
  location: (id: string) => ObjectLocation
  put: (location: ObjectLocation, bytes: Uint8Array) => Promise<void>
  get: (location: ObjectLocation, size: number, sha256: string) => Promise<Uint8Array>
  remove: (location: ObjectLocation) => Promise<void>
}
export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const localBucket = '!portal-local'
const localRoot = () => resolve(process.env.ATTACHMENT_LOCAL_DIR || '.data/attachments')
const localPath = (location: ObjectLocation) => {
  if (location.bucket !== localBucket || !/^[a-f0-9]{32}$/.test(location.objectKey))
    return fail(502, 'ATTACHMENT_STORAGE_ERROR')
  return join(localRoot(), location.objectKey)
}
const verified = (bytes: Uint8Array, size: number, checksum: string) => {
  if (bytes.byteLength !== size || sha256(bytes) !== checksum)
    return fail(502, 'ATTACHMENT_STORAGE_ERROR')
  return bytes
}
const localStorage: AttachmentStorage = {
  location: (id) => ({ bucket: localBucket, objectKey: id }),
  put: async (location, bytes) => {
    const path = localPath(location)
    await mkdir(localRoot(), { recursive: true, mode: 0o700 })
    const file = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    )
    try {
      await file.writeFile(bytes)
      await file.sync()
    } catch (error) {
      await file.close()
      await unlink(path).catch(() => undefined)
      throw error
    }
    await file.close()
  },
  get: async (location, size, checksum) => {
    const file = await open(localPath(location), constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const stat = await file.stat()
      if (!stat.isFile() || stat.size !== size) return fail(502, 'ATTACHMENT_STORAGE_ERROR')
      return verified(new Uint8Array(await file.readFile()), size, checksum)
    } finally {
      await file.close()
    }
  },
  remove: async (location) => {
    try {
      await unlink(localPath(location))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}
const s3Storage = (bucket: string): AttachmentStorage => {
  const endpoint = process.env.S3_ENDPOINT || undefined
  if (endpoint) {
    const url = new URL(endpoint)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error(
        'S3_ENDPOINT must be an HTTP(S) endpoint without credentials, query or fragment'
      )
  }
  const prefix = process.env.S3_PREFIX || 'portal-attachments'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,199}$/.test(prefix)) throw new Error('Invalid S3_PREFIX')
  const pathStyle = process.env.S3_FORCE_PATH_STYLE ?? 'false'
  if (!['true', 'false'].includes(pathStyle))
    throw new Error('S3_FORCE_PATH_STYLE must be true or false')
  // Credentials use the AWS server-side provider chain (environment, IAM roles, etc.).
  const client = new S3Client({
    region: process.env.S3_REGION || process.env.AWS_REGION || 'ca-central-1',
    endpoint,
    forcePathStyle: pathStyle === 'true',
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  })
  const parameters = (location: ObjectLocation) => ({
    Bucket: location.bucket,
    Key: location.objectKey
  })
  return {
    location: (id) => ({ bucket, objectKey: `${prefix}/${id}` }),
    put: async (location, bytes) => {
      await client.send(
        new PutObjectCommand({
          ...parameters(location),
          Body: bytes,
          ContentLength: bytes.byteLength,
          ContentType: 'application/octet-stream',
          IfNoneMatch: '*'
        }),
        { abortSignal: AbortSignal.timeout(60_000) }
      )
    },
    get: async (location, size, checksum) => {
      const result = await client.send(new GetObjectCommand(parameters(location)), {
        abortSignal: AbortSignal.timeout(60_000)
      })
      if (!result.Body) return fail(502, 'ATTACHMENT_STORAGE_ERROR')
      const bytes = await readBoundedBody(
        new Request('http://attachment.internal', {
          method: 'POST',
          body: result.Body.transformToWebStream(),
          duplex: 'half'
        } as RequestInit),
        size
      )
      if (!bytes) return fail(502, 'ATTACHMENT_STORAGE_ERROR')
      return verified(bytes, size, checksum)
    },
    remove: async (location) => {
      await client.send(new DeleteObjectCommand(parameters(location)), {
        abortSignal: AbortSignal.timeout(60_000)
      })
    }
  }
}
export const attachmentStorage = (): AttachmentStorage => {
  const current = process.env.S3_BUCKET ? s3Storage(process.env.S3_BUCKET) : localStorage
  return {
    location: current.location,
    put: (location, bytes) =>
      (location.bucket === localBucket ? localStorage : current).put(location, bytes),
    get: (location, size, checksum) =>
      (location.bucket === localBucket ? localStorage : current).get(location, size, checksum),
    remove: (location) =>
      (location.bucket === localBucket ? localStorage : current).remove(location)
  }
}
