import { z } from 'zod'
import { v7 as uuid } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'
import { attachmentsAllowed, responseSubjects, versionInput } from '../../shared/schemas/cases'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { lockOrganization, requireBusinessAccess } from './case-access'
import { responseRow } from './response-records'
import { requireResponsePublication } from './response-publication'
import { attachmentMetadata } from './attachment-records'
import { attachmentConfig } from './attachment-config'
import { attachmentStorage, sha256, type AttachmentStorage } from './attachment-storage'
const uploadInput = z
  .object({
    expectedRevision: z.coerce.number().int().positive(),
    filename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(
        (name) =>
          ![...name].some(
            (character) =>
              character.charCodeAt(0) < 32 ||
              character.charCodeAt(0) === 127 ||
              character === '/' ||
              character === '\\'
          )
      ),
    itemId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/)
  })
  .strict()
const validateUploadTarget = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string,
  responseId: string,
  input: z.infer<typeof uploadInput>
) => {
  const row = await responseRow(db, organizationId, responseId)
  await requireBusinessAccess(
    db,
    organizationId,
    userId,
    responseSubjects(row.snapshot),
    'contributor'
  )
  if (row.status !== 'draft') return fail(409, 'RESPONSE_FINAL')
  if (row.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
  await requireResponsePublication(db, row.setId, row.snapshot)
  const item = row.snapshot.items.find((entry) => entry.item.id === input.itemId)
  if (!item || !attachmentsAllowed(item)) return fail(400, 'ATTACHMENTS_NOT_ALLOWED')
  return row
}
export const authorizeAttachmentUpload = async (
  db: Kysely<Database>,
  organizationId: string,
  userId: string,
  responseId: string,
  body: unknown
) => {
  const input = uploadInput.parse(body)
  await db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    await validateUploadTarget(tx, organizationId, userId, responseId, input)
    if (!attachmentConfig().configured) return fail(503, 'ATTACHMENT_STORAGE_UNAVAILABLE')
  })
  return input
}
/** Reserve before S3 upload; crashes leave a private, identifiable object for cleanup. */
export const uploadAttachment = async (
  db: Kysely<Database>,
  organizationId: string,
  userId: string,
  responseId: string,
  body: unknown,
  bytes: Uint8Array,
  storage?: AttachmentStorage
) => {
  const input = uploadInput.parse(body),
    limits = attachmentConfig()
  if (!bytes.byteLength || bytes.byteLength > limits.maxBytes)
    return fail(413, 'ATTACHMENT_TOO_LARGE')
  const objectStorage = storage ?? attachmentStorage()
  const id = uuid(),
    location = objectStorage.location(id),
    checksum = sha256(bytes)
  const reservedRevision = await db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    const row = await validateUploadTarget(tx, organizationId, userId, responseId, input)
    const files = await attachmentMetadata(tx, responseId)
    if (
      files.filter((file) => file.itemId === input.itemId).length >= limits.maxFilesPerForm ||
      files.reduce((total, file) => total + file.size, 0) + bytes.byteLength >
        limits.maxResponseBytes
    )
      return fail(400, 'ATTACHMENT_LIMIT')
    await tx
      .insertInto('response_attachment')
      .values({
        id,
        responseId,
        itemId: input.itemId,
        filename: input.filename,
        size: bytes.byteLength,
        sha256: checksum,
        ...location,
        status: 'pending',
        createdBy: userId,
        createdAt: new Date()
      })
      .execute()
    await tx
      .updateTable('set_response')
      .set({ revision: row.revision + 1, updatedBy: userId, updatedAt: new Date() })
      .where('id', '=', responseId)
      .execute()
    return row.revision + 1
  })
  try {
    await objectStorage.put(location, bytes)
    return await db.transaction().execute(async (tx) => {
      await lockOrganization(tx, organizationId)
      const row = await responseRow(tx, organizationId, responseId)
      await requireBusinessAccess(
        tx,
        organizationId,
        userId,
        responseSubjects(row.snapshot),
        'contributor'
      )
      if (row.status !== 'draft' || row.revision !== reservedRevision)
        return fail(409, 'REVISION_CONFLICT')
      await requireResponsePublication(tx, row.setId, row.snapshot)
      const file = await tx
        .selectFrom('response_attachment')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst()
      if (file?.responseId !== responseId || file.status !== 'pending')
        return fail(409, 'REVISION_CONFLICT')
      await tx
        .updateTable('response_attachment')
        .set({ status: 'ready' })
        .where('id', '=', id)
        .execute()
      return { revision: row.revision, attachments: await attachmentMetadata(tx, responseId) }
    })
  } catch (error) {
    // Do not delete the object during a possibly in-flight PUT. The cleanup grace period exceeds its timeout.
    await db
      .updateTable('response_attachment')
      .set({ responseId: null })
      .where('id', '=', id)
      .execute()
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    return fail(502, 'ATTACHMENT_STORAGE_ERROR')
  }
}
export const removeAttachment = async (
  db: Kysely<Database>,
  organizationId: string,
  userId: string,
  responseId: string,
  id: string,
  body: unknown
) => {
  const input = versionInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    const row = await responseRow(tx, organizationId, responseId)
    await requireBusinessAccess(
      tx,
      organizationId,
      userId,
      responseSubjects(row.snapshot),
      'contributor'
    )
    if (row.status !== 'draft') return fail(409, 'RESPONSE_FINAL')
    if (row.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
    await requireResponsePublication(tx, row.setId, row.snapshot)
    const removed = await tx
      .updateTable('response_attachment')
      .set({ responseId: null })
      .where('responseId', '=', responseId)
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst()
    if (!removed) return fail(404, 'ATTACHMENT_NOT_FOUND')
    await tx
      .updateTable('set_response')
      .set({ revision: row.revision + 1, updatedBy: userId, updatedAt: new Date() })
      .where('id', '=', responseId)
      .execute()
    return { revision: row.revision + 1, attachments: await attachmentMetadata(tx, responseId) }
  })
}
const readFile = async (
  db: GovernmentDb,
  responseId: string,
  id: string,
  storage: AttachmentStorage
) => {
  const file = await db
    .selectFrom('response_attachment')
    .selectAll()
    .where('id', '=', id)
    .where('responseId', '=', responseId)
    .where('status', '=', 'ready')
    .executeTakeFirst()
  if (!file) return fail(404, 'ATTACHMENT_NOT_FOUND')
  try {
    return { filename: file.filename, bytes: await storage.get(file, file.size, file.sha256) }
  } catch {
    return fail(502, 'ATTACHMENT_STORAGE_ERROR')
  }
}
export const organizationAttachment = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string,
  responseId: string,
  id: string,
  storage?: AttachmentStorage
) => {
  const row = await responseRow(db, organizationId, responseId)
  await requireBusinessAccess(db, organizationId, userId, responseSubjects(row.snapshot), 'viewer')
  return readFile(db, responseId, id, storage ?? attachmentStorage())
}
export const governmentAttachment = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  submissionId: string,
  id: string,
  storage?: AttachmentStorage
) => {
  const row = await db
    .selectFrom('set_response as r')
    .innerJoin('submission_set as s', 's.id', 'r.setId')
    .select(['r.id', 's.agencyId'])
    .where('r.submissionId', '=', submissionId)
    .where('r.status', '=', 'submitted')
    .executeTakeFirst()
  if (!row) return fail(404, 'RESPONSE_NOT_FOUND')
  await requireGovernment(db, actor, { agencyId: row.agencyId })
  return readFile(db, row.id, id, storage ?? attachmentStorage())
}
/** Run periodically. One-hour grace is longer than any S3 PUT timeout, including retries. */
export const cleanupAttachments = async (db: Kysely<Database>, storage?: AttachmentStorage) => {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000)
  const files = await db.transaction().execute(async (tx) => {
    const rows = await tx
      .selectFrom('response_attachment')
      .selectAll()
      .where('createdAt', '<', cutoff)
      .where((eb) => eb.or([eb('responseId', 'is', null), eb('status', '=', 'pending')]))
      .limit(100)
      .forUpdate()
      .skipLocked()
      .execute()
    if (rows.length)
      await tx
        .updateTable('response_attachment')
        .set({ responseId: null })
        .where(
          'id',
          'in',
          rows.map((row) => row.id)
        )
        .execute()
    return rows
  })
  let removed = 0,
    failed = 0
  for (const file of files) {
    try {
      await (storage ?? attachmentStorage()).remove(file)
      const deleted = await db
        .deleteFrom('response_attachment')
        .where('id', '=', file.id)
        .where('responseId', 'is', null)
        .returning('id')
        .executeTakeFirst()
      if (deleted) removed++
    } catch {
      failed++
    }
  }
  return { removed, failed }
}
