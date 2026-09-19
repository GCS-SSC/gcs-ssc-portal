import { afterAll, beforeAll, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import pg from 'pg'
import { createDatabase } from '../../server/utils/database'
import type { Database } from '../../server/db/schema'
import type { GovernmentActor } from '../../server/utils/government-access'
import type { SurveyDefinition } from '@gcs-ssc/survey'
import * as surveys from '../../server/utils/surveys'
import * as structure from '../../server/utils/government-structure'
import * as portal from '../../server/utils/portal'
import { bootstrapRoot } from '../../server/utils/government-admin'
import { startApplication } from '../../server/utils/applications'
import {
  checkResponse,
  mutateResponse,
  getResponse,
  governmentResponse,
  exportSubmission
} from '../../server/utils/set-responses'
import {
  uploadAttachment,
  removeAttachment,
  organizationAttachment,
  governmentAttachment,
  cleanupAttachments
} from '../../server/utils/attachments'
import { sha256, type AttachmentStorage } from '../../server/utils/attachment-storage'
import { attachmentsAllowed } from '../../shared/schemas/cases'
let db: Kysely<Database>, actor: GovernmentActor, agencyId: string, streamId: string, orgId: string
const names = { nameEn: 'Applications', nameFr: 'Demandes' }
const definition: SurveyDefinition = {
  schemaVersion: 1,
  title: { en: 'Project', fr: 'Projet' },
  attachments: { enabled: true },
  questions: [{ id: 'name', type: 'text', label: { en: 'Name', fr: 'Nom' }, required: true }]
}
const objects = new Map<string, Uint8Array>()
const storage: AttachmentStorage = {
  location: (id) => ({ bucket: 'test-private', objectKey: `files/${id}` }),
  put: async (location, bytes) => {
    objects.set(location.objectKey, bytes)
  },
  get: async (location, size, checksum) => {
    const bytes = objects.get(location.objectKey)!
    expect(bytes.byteLength).toBe(size)
    expect(sha256(bytes)).toBe(checksum)
    return bytes
  },
  remove: async (location) => {
    objects.delete(location.objectKey)
  }
}
const bytes = new TextEncoder().encode('private supporting evidence')
beforeAll(async () => {
  const url = process.env.PORTAL_TEST_DATABASE_URL
  if (url) {
    if (!new URL(url).pathname.endsWith('_test'))
      throw new Error('Disposable test database required')
    const guard = new pg.Client({ connectionString: url })
    await guard.connect()
    try {
      if (
        (
          await guard.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1"
          )
        ).rowCount
      )
        throw new Error('Refusing a nonempty database')
    } finally {
      await guard.end()
    }
  }
  db = await createDatabase({ url })
  const root = await bootstrapRoot(db, {
    name: 'Root',
    email: 'root@applications.test',
    password: 'Root-test-only-2026!'
  })
  actor = { kind: 'user', userId: root.id }
  for (const id of ['owner', 'viewer', 'contributor', 'manager'])
    await db
      .insertInto('user')
      .values({
        id,
        name: id,
        email: `${id}@applications.test`,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .execute()
  orgId = (await portal.createOrganization(db, 'owner', { name: 'Application organization' }))
    .organization.id
  for (const level of ['viewer', 'contributor', 'manager'] as const) {
    await db
      .insertInto('membership')
      .values({ organizationId: orgId, userId: level, joinedAt: new Date() })
      .execute()
    await portal.updatePermissions(db, orgId, 'owner', level, {
      permissions: ['user', `application:${level}`]
    })
  }
  agencyId = (await structure.createAgency(db, actor, names)).agency.id
  const program = await structure.createProgram(db, actor, { agencyId, ...names })
  streamId = (await structure.createStream(db, actor, { programId: program.program.id, ...names }))
    .stream.id
}, 60000)
afterAll(async () => {
  await db?.destroy()
})
const createCall = async (enabled = true) => {
  const survey = (
    await surveys.createSurvey(db, actor, {
      agencyId,
      definition: { ...definition, attachments: { enabled } }
    })
  ).survey
  const call = await structure.saveCall(db, actor, {
    streamId,
    ...names,
    startDate: '2020-01-01',
    endDate: '2099-12-31'
  })
  await surveys.attachSurvey(db, actor, call.id, { surveyId: survey.id, revision: 1 })
  await structure.publishCall(db, actor, call.id, { published: true })
  return call.id
}
const start = async (callId: string) =>
  (await startApplication(db, orgId, 'contributor', callId, { locale: 'en' })).response
const save = async (id: string, revision: number) =>
  (
    await mutateResponse(db, orgId, 'contributor', id, 'save', {
      expectedRevision: revision,
      items: [{ id: 'application', kind: 'survey', answers: { name: 'Digital project' } }]
    })
  ).response
const upload = (id: string, revision: number, target = storage) =>
  uploadAttachment(
    db,
    orgId,
    'contributor',
    id,
    { expectedRevision: revision, itemId: 'application', filename: 'evidence.txt' },
    bytes,
    target
  )
it('uses application permissions and immutable pinned forms, privately stores files and exports submitted evidence', async () => {
  const callId = await createCall()
  await expect(
    startApplication(db, orgId, 'viewer', callId, { locale: 'en' })
  ).rejects.toMatchObject({ statusCode: 403 })
  await expect(
    startApplication(db, orgId, 'owner', callId, { locale: 'en' })
  ).rejects.toMatchObject({ statusCode: 403 })
  const [first, second] = await Promise.all([start(callId), start(callId)])
  expect(first.id).toBe(second.id)
  expect(first.snapshot.application?.callId).toBe(callId)
  const draft = await save(first.id, first.revision)
  await expect(
    uploadAttachment(
      db,
      orgId,
      'viewer',
      draft.id,
      { expectedRevision: draft.revision, itemId: 'application', filename: 'evidence.txt' },
      bytes,
      storage
    )
  ).rejects.toMatchObject({ statusCode: 403 })
  const attached = await upload(draft.id, draft.revision)
  const file = attached.attachments[0]!
  expect(file.status).toBe('ready')
  expect(file).not.toHaveProperty('objectKey')
  expect(
    (await organizationAttachment(db, orgId, 'viewer', draft.id, file.id, storage)).bytes
  ).toEqual(bytes)
  await expect(
    organizationAttachment(db, orgId, 'owner', draft.id, file.id, storage)
  ).rejects.toMatchObject({ statusCode: 403 })
  await expect(
    mutateResponse(db, orgId, 'contributor', draft.id, 'submit', {
      expectedRevision: attached.revision,
      balanceRevision: null,
      warningsAcknowledged: true
    })
  ).rejects.toMatchObject({ statusCode: 403 })
  const check = await checkResponse(db, orgId, 'manager', draft.id, {
    expectedRevision: attached.revision
  })
  const final = await mutateResponse(db, orgId, 'manager', draft.id, 'submit', {
    expectedRevision: attached.revision,
    balanceRevision: check.balanceRevision,
    warningsAcknowledged: true
  })
  const submissionId = final.response.submissionId!
  expect((await exportSubmission(db, actor, submissionId)).submission).toMatchObject({
    application: { callId },
    attachments: [{ id: file.id, sha256: sha256(bytes) }]
  })
  expect((await governmentResponse(db, actor, submissionId)).attachments).toEqual(
    attached.attachments
  )
  expect((await governmentAttachment(db, actor, submissionId, file.id, storage)).bytes).toEqual(
    bytes
  )
  await expect(
    removeAttachment(db, orgId, 'manager', draft.id, file.id, {
      expectedRevision: final.response.revision
    })
  ).rejects.toMatchObject({ statusCode: 409 })
  await structure.publishCall(db, actor, callId, { published: false })
  expect((await getResponse(db, orgId, 'viewer', draft.id)).response.status).toBe('submitted')
})
it('checks opt-in, names, limits, stale revisions and pending uploads before allowing submission', async () => {
  const disabled = await start(await createCall(false))
  await expect(upload(disabled.id, 1)).rejects.toMatchObject({ statusCode: 400 })
  expect(attachmentsAllowed({ item: { id: 'claim', kind: 'claim', fiscalYearId: 'fy' } })).toBe(
    false
  )
  expect(
    attachmentsAllowed({
      item: { id: 'claim', kind: 'claim', fiscalYearId: 'fy', attachments: { enabled: true } }
    })
  ).toBe(true)
  const draft = await start(await createCall())
  await expect(
    uploadAttachment(
      db,
      orgId,
      'contributor',
      draft.id,
      { expectedRevision: 1, itemId: 'application', filename: '../bad.txt' },
      bytes,
      storage
    )
  ).rejects.toThrow()
  await expect(upload(draft.id, 999)).rejects.toMatchObject({ statusCode: 409 })
  const saved = await save(draft.id, 1)
  let finish!: () => void, started!: () => void
  const waiting = new Promise<void>((resolve) => {
      finish = resolve
    }),
    uploading = new Promise<void>((resolve) => {
      started = resolve
    })
  const pending = upload(draft.id, saved.revision, {
    ...storage,
    put: async (...args) => {
      started()
      await waiting
      await storage.put(...args)
    }
  })
  await uploading
  const during = await getResponse(db, orgId, 'viewer', draft.id)
  expect(during.attachments[0]!.status).toBe('pending')
  await expect(
    checkResponse(db, orgId, 'manager', draft.id, { expectedRevision: during.response.revision })
  ).rejects.toMatchObject({ statusCode: 409 })
  finish()
  const completed = await pending
  const removed = await removeAttachment(
    db,
    orgId,
    'contributor',
    draft.id,
    completed.attachments[0]!.id,
    { expectedRevision: completed.revision }
  )
  expect(removed.attachments).toEqual([])
  await expect(
    organizationAttachment(db, orgId, 'viewer', draft.id, completed.attachments[0]!.id, storage)
  ).rejects.toMatchObject({ statusCode: 404 })
  await db
    .updateTable('response_attachment')
    .set({ createdAt: new Date(Date.now() - 7200000) })
    .where('id', '=', completed.attachments[0]!.id)
    .execute()
  expect((await cleanupAttachments(db, storage)).removed).toBe(1)
})
it('retains failed upload reservations for cleanup and never finalizes after a concurrent draft change', async () => {
  const draft = await start(await createCall())
  const failedStorage = {
    ...storage,
    put: async (...args: Parameters<AttachmentStorage['put']>) => {
      await storage.put(...args)
      throw new Error('connection dropped')
    }
  }
  await expect(upload(draft.id, 1, failedStorage)).rejects.toMatchObject({ statusCode: 502 })
  const failed = await getResponse(db, orgId, 'viewer', draft.id)
  expect(failed.attachments).toEqual([])
  expect(failed.response.revision).toBe(2)
  const concurrent = {
    ...storage,
    put: async (...args: Parameters<AttachmentStorage['put']>) => {
      await storage.put(...args)
      await save(draft.id, 3)
    }
  }
  await expect(upload(draft.id, 2, concurrent)).rejects.toMatchObject({ statusCode: 409 })
  expect((await getResponse(db, orgId, 'viewer', draft.id)).attachments).toEqual([])
  await db
    .updateTable('response_attachment')
    .set({ createdAt: new Date(Date.now() - 7200000) })
    .where('responseId', 'is', null)
    .execute()
  expect((await cleanupAttachments(db, storage)).removed).toBe(2)
})
it('blocks changed/closed calls, keeps superseded drafts readable and permits manager deletion', async () => {
  const callId = await createCall(),
    draft = await start(callId)
  await structure.publishCall(db, actor, callId, { published: false })
  await expect(save(draft.id, 1)).rejects.toMatchObject({ statusCode: 409 })
  await structure.saveCall(
    db,
    actor,
    { streamId, ...names, startDate: '2020-01-01', endDate: '2021-12-31' },
    callId
  )
  await structure.publishCall(db, actor, callId, { published: true })
  await expect(start(callId)).rejects.toMatchObject({ statusCode: 409 })
  await expect(save(draft.id, 1)).rejects.toMatchObject({ statusCode: 409 })
  await expect(
    mutateResponse(db, orgId, 'contributor', draft.id, 'delete', { expectedRevision: 1 })
  ).rejects.toMatchObject({ statusCode: 403 })
  await mutateResponse(db, orgId, 'manager', draft.id, 'delete', { expectedRevision: 1 })
  await expect(getResponse(db, orgId, 'viewer', draft.id)).rejects.toMatchObject({
    statusCode: 404
  })
})

it('enforces per-form and whole-response capacity and protects other organizations', async () => {
  const draft = await start(await createCall())
  const originalCount = process.env.ATTACHMENT_MAX_FILES_PER_FORM
  const originalTotal = process.env.ATTACHMENT_MAX_RESPONSE_BYTES
  try {
    process.env.ATTACHMENT_MAX_FILES_PER_FORM = '1'
    const result = await upload(draft.id, 1)
    await expect(upload(draft.id, result.revision)).rejects.toMatchObject({ statusCode: 400 })
    process.env.ATTACHMENT_MAX_FILES_PER_FORM = '10'
    process.env.ATTACHMENT_MAX_RESPONSE_BYTES = String(bytes.byteLength)
    await expect(upload(draft.id, result.revision)).rejects.toMatchObject({ statusCode: 400 })
    const foreignOrg = (
      await portal.createOrganization(db, 'owner', { name: 'Other organization' })
    ).organization.id
    await expect(
      organizationAttachment(db, foreignOrg, 'owner', draft.id, result.attachments[0]!.id, storage)
    ).rejects.toMatchObject({ statusCode: 404 })
    // Even the correct uploader cannot download an attachment under a different response.
    const another = await start(await createCall())
    await expect(
      organizationAttachment(
        db,
        orgId,
        'contributor',
        another.id,
        result.attachments[0]!.id,
        storage
      )
    ).rejects.toMatchObject({ statusCode: 404 })
  } finally {
    if (originalCount === undefined) delete process.env.ATTACHMENT_MAX_FILES_PER_FORM
    else process.env.ATTACHMENT_MAX_FILES_PER_FORM = originalCount
    if (originalTotal === undefined) delete process.env.ATTACHMENT_MAX_RESPONSE_BYTES
    else process.env.ATTACHMENT_MAX_RESPONSE_BYTES = originalTotal
  }
})
