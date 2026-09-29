import { afterAll, beforeAll, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Kysely } from 'kysely'
import pg from 'pg'
import { createDatabase } from '../../server/utils/database'
import type { Database } from '../../server/db/schema'
import type { GovernmentActor } from '../../server/utils/government-access'
import type { SurveyDefinition } from '@gcs-ssc/survey'
import * as surveys from '../../server/utils/surveys'
import * as structure from '../../server/utils/government-structure'
import * as portal from '../../server/utils/portal'
import { decodePublicId } from '../../server/utils/public-identifiers'
import { createAdministrator } from '../../server/utils/administrator-accounts'
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
import { attachmentsAllowed } from '../../shared/schemas/agreements'
import { callInput } from '../../shared/schemas/government'
let db: Kysely<Database>, actor: GovernmentActor, agencyId: number, streamId: number, orgId: number
type Role = 'owner' | 'viewer' | 'contributor' | 'manager'
const users = {} as Record<Role, number>
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
it('uploads, downloads and cleans up through the local backend when S3 is unset', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portal-local-integration-'))
  const previousBucket = process.env.S3_BUCKET
  const previousDirectory = process.env.ATTACHMENT_LOCAL_DIR
  try {
    delete process.env.S3_BUCKET
    process.env.ATTACHMENT_LOCAL_DIR = join(directory, 'files')
    const draft = await start(await createCall())
    const uploaded = await uploadAttachment(
      db,
      orgId,
      users.contributor,
      draft.id,
      {
        expectedRevision: draft.revision,
        itemId: 'application',
        filename: 'local-evidence.txt'
      },
      bytes
    )
    const file = uploaded.attachments[0]!
    expect(
      (await organizationAttachment(db, orgId, users.viewer, draft.id, file.id)).bytes
    ).toEqual(bytes)
    await removeAttachment(db, orgId, users.contributor, draft.id, file.id, {
      expectedRevision: uploaded.revision
    })
    await db
      .updateTable('response_attachment')
      .set({ createdAt: new Date(Date.now() - 7200000) })
      .where('id', '=', file.id)
      .execute()
    expect((await cleanupAttachments(db)).removed).toBe(1)
  } finally {
    if (previousBucket === undefined) delete process.env.S3_BUCKET
    else process.env.S3_BUCKET = previousBucket
    if (previousDirectory === undefined) delete process.env.ATTACHMENT_LOCAL_DIR
    else process.env.ATTACHMENT_LOCAL_DIR = previousDirectory
    await rm(directory, { recursive: true, force: true })
  }
})
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
  const root = await createAdministrator(db, {
    name: 'Root',
    email: 'root@applications.test',
    password: 'Root-test-only-2026!'
  })
  actor = { kind: 'administrator', administratorId: root.id }
  for (const role of ['owner', 'viewer', 'contributor', 'manager'] as const)
    users[role] = (
      await db
        .insertInto('user')
        .values({
          name: role,
          email: `${role}@applications.test`,
          emailVerified: false,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id
  orgId = decodePublicId(
    (await portal.createOrganization(db, users.owner, { name: 'Application organization' }))
      .organization.id,
    'organization'
  )
  for (const level of ['viewer', 'contributor', 'manager'] as const) {
    await db
      .insertInto('membership')
      .values({ organizationId: orgId, userId: users[level], joinedAt: new Date() })
      .execute()
    await portal.updatePermissions(db, orgId, users.owner, users[level], {
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
  (await startApplication(db, orgId, users.contributor, callId, { locale: 'en' })).response
it('starts one application containing every ordered, pinned opportunity form', async () => {
  const first = (await surveys.createSurvey(db, actor, { agencyId, definition })).survey
  const secondDefinition: SurveyDefinition = { ...definition,
    title: { en: 'Budget', fr: 'Budget' },
    questions: [{ id: 'amount', type: 'number', label: { en: 'Amount', fr: 'Montant' }, required: true }] }
  const second = (await surveys.createSurvey(db, actor, { agencyId, definition: secondDefinition })).survey
  const call = await structure.saveCall(db, actor, { streamId, ...names,
    startDate: '2020-01-01', endDate: '2099-12-31' })
  await surveys.attachCallForms(db, actor, call.id, { forms: [
    { surveyId: first.id, revision: 1 }, { surveyId: second.id, revision: 1 }
  ] })
  await structure.publishCall(db, actor, call.id, { published: true })
  const preview = await surveys.applicantSurvey(db, orgId, users.viewer, call.id)
  expect(preview.forms.map(form => form.definition.title.en)).toEqual(['Project', 'Budget'])
  const draft = await start(call.id)
  expect(draft.snapshot.items.map(entry => entry.item.id)).toEqual(['application', 'application-2'])
  expect(draft.snapshot.items.map(entry => entry.survey?.title.en)).toEqual(['Project', 'Budget'])
  await surveys.updateSurvey(db, actor, second.id, { expectedRevision: 1,
    definition: { ...secondDefinition, title: { en: 'Changed', fr: 'Modifié' } } })
  expect((await start(call.id)).snapshot.items[1]?.survey?.title.en).toBe('Budget')
  await expect(surveys.attachCallForms(db, actor, call.id, { forms: [
    { surveyId: second.id, revision: 2 }
  ] })).rejects.toMatchObject({ statusCode: 409 })
})
it('keeps a withdrawn call when an organization already has an application draft', async () => {
  const callId = await createCall()
  await start(callId)
  await structure.publishCall(db, actor, callId, { published: false })
  await expect(structure.deleteDraftCall(db, actor, callId)).rejects.toMatchObject({ statusCode: 409 })
  expect(await db.selectFrom('funding_call').select('id').where('id', '=', callId).executeTakeFirst())
    .toBeDefined()
})
it('rejects stale call metadata and keeps attached forms fixed after a submission', async () => {
  const callId = await createCall()
  const original = (await structure.agencyStructure(db, actor, agencyId)).calls.find(call => call.id === callId)!
  const values = { streamId, ...names, startDate: '2020-01-01', endDate: '2099-12-31' }
  await expect(structure.saveCall(db, actor, values, callId)).rejects.toThrow()
  await structure.publishCall(db, actor, callId, { published: false })
  await structure.saveCall(db, actor, { ...values, nameEn: 'Revised intake', expectedRevision: original.revision }, callId)
  await expect(structure.saveCall(db, actor, { ...values, nameFr: 'Révisé', expectedRevision: original.revision }, callId))
    .rejects.toMatchObject({ statusCode: 409 })
  const updated = (await structure.agencyStructure(db, actor, agencyId)).calls.find(call => call.id === callId)!
  expect(updated).toMatchObject({ nameEn: 'Revised intake', nameFr: names.nameFr,
    revision: original.revision + 1 })
  await structure.publishCall(db, actor, callId, { published: true })
  const draft = await start(callId)
  expect(draft.snapshot.items[0]?.item).toMatchObject({ kind: 'survey', surveyRevision: 1 })
  const surveyId = (await db.selectFrom('funding_call').select('surveyId').where('id', '=', callId)
    .executeTakeFirstOrThrow()).surveyId!
  await surveys.updateSurvey(db, actor, surveyId, { expectedRevision: 1,
    definition: { ...definition, questions: [...definition.questions,
      { id: 'extra', type: 'text', label: { en: 'Extra', fr: 'Supplément' }, required: true }] } })
  await expect(mutateResponse(db, orgId, users.manager, draft.id, 'submit', {
    expectedRevision: draft.revision, balanceRevision: null, warningsAcknowledged: true
  })).rejects.toMatchObject({ statusCode: 400, message: 'RESPONSE_INVALID' })
  const saved = await save(draft.id, draft.revision)
  const checked = await checkResponse(db, orgId, users.manager, draft.id, { expectedRevision: saved.revision })
  const submitted = await mutateResponse(db, orgId, users.manager, draft.id, 'submit', {
    expectedRevision: saved.revision, balanceRevision: checked.balanceRevision, warningsAcknowledged: true
  })
  const pinned = submitted.response.snapshot.items[0]?.survey
  expect(submitted.response.snapshot.items[0]?.item).toMatchObject({ surveyRevision: 1 })
  await structure.publishCall(db, actor, callId, { published: false })
  await expect(surveys.attachCallForms(db, actor, callId, { forms: [{ surveyId, revision: 2 }] }))
    .rejects.toMatchObject({ statusCode: 409 })
  expect((await getResponse(db, orgId, users.viewer, draft.id)).response.snapshot.items[0]?.survey).toEqual(pinned)
  expect((await structure.agencyStructure(db, actor, agencyId)).calls.find(call => call.id === callId)?.surveyRevision).toBe(1)
})
const save = async (id: string, revision: number) =>
  (
    await mutateResponse(db, orgId, users.contributor, id, 'save', {
      expectedRevision: revision,
      items: [{ id: 'application', kind: 'survey', answers: { name: 'Digital project' } }]
    })
  ).response
const upload = (id: string, revision: number, target = storage) =>
  uploadAttachment(
    db,
    orgId,
    users.contributor,
    id,
    { expectedRevision: revision, itemId: 'application', filename: 'evidence.txt' },
    bytes,
    target
  )
it('validates UTC call times and enforces both boundaries on existing drafts', async () => {
  const details = { streamId, ...names, startDate: '2026-09-25', endDate: '2026-09-25' }
  expect(callInput.safeParse({ ...details, startTime: '12:30', endTime: '12:29' }).success).toBe(
    false
  )
  expect(callInput.safeParse({ ...details, startTime: '24:00', endTime: '25:00' }).success).toBe(
    false
  )
  expect(callInput.parse(details)).toMatchObject({
    startTime: '00:00:00.000000',
    endTime: '23:59:59.999999'
  })
  const configured = await structure.saveCall(db, actor, {
    ...details,
    startTime: '09:00',
    endTime: '17:00'
  })
  expect(
    (await structure.agencyStructure(db, actor, agencyId)).calls.find(
      (call) => call.id === configured.id
    )
  ).toMatchObject({ startTime: '09:00:00.000000', endTime: '17:00:00.000000' })
  expect(
    callInput.safeParse({
      ...details,
      startTime: '09:00:00.000000',
      endTime: '17:00:00.000000'
    }).success
  ).toBe(true)

  const callId = await createCall(false)
  const draft = await start(callId)
  const futureStart = new Date(Date.now() + 180000).toISOString()
  const futureEnd = new Date(Date.now() + 360000).toISOString()
  await db
    .updateTable('funding_call')
    .set({
      startDate: futureStart.slice(0, 10),
      startTime: futureStart.slice(11, 16),
      endDate: futureEnd.slice(0, 10),
      endTime: futureEnd.slice(11, 16)
    })
    .where('id', '=', callId)
    .execute()
  await expect(save(draft.id, draft.revision)).rejects.toMatchObject({ statusCode: 409 })

  const pastStart = new Date(Date.now() - 360000).toISOString()
  const pastEnd = new Date(Date.now() - 180000).toISOString()
  await db
    .updateTable('funding_call')
    .set({
      startDate: pastStart.slice(0, 10),
      startTime: pastStart.slice(11, 16),
      endDate: pastEnd.slice(0, 10),
      endTime: pastEnd.slice(11, 16)
    })
    .where('id', '=', callId)
    .execute()
  await expect(
    checkResponse(db, orgId, users.manager, draft.id, {
      expectedRevision: draft.revision
    })
  ).rejects.toMatchObject({ statusCode: 409 })
  await expect(
    mutateResponse(db, orgId, users.manager, draft.id, 'submit', {
      expectedRevision: draft.revision,
      balanceRevision: null,
      warningsAcknowledged: true
    })
  ).rejects.toMatchObject({ statusCode: 409 })
})
it('uses application permissions and immutable pinned forms, privately stores files and exports submitted evidence', async () => {
  const callId = await createCall()
  await expect(
    startApplication(db, orgId, users.viewer, callId, { locale: 'en' })
  ).rejects.toMatchObject({ statusCode: 403 })
  await expect(
    startApplication(db, orgId, users.owner, callId, { locale: 'en' })
  ).rejects.toMatchObject({ statusCode: 403 })
  const [first, second] = await Promise.all([start(callId), start(callId)])
  expect(first.id).toBe(second.id)
  expect(first.snapshot.application?.callId).toBe(callId)
  const draft = await save(first.id, first.revision)
  await expect(
    uploadAttachment(
      db,
      orgId,
      users.viewer,
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
    (await organizationAttachment(db, orgId, users.viewer, draft.id, file.id, storage)).bytes
  ).toEqual(bytes)
  await expect(
    organizationAttachment(db, orgId, users.owner, draft.id, file.id, storage)
  ).rejects.toMatchObject({ statusCode: 403 })
  await expect(
    mutateResponse(db, orgId, users.contributor, draft.id, 'submit', {
      expectedRevision: attached.revision,
      balanceRevision: null,
      warningsAcknowledged: true
    })
  ).rejects.toMatchObject({ statusCode: 403 })
  const check = await checkResponse(db, orgId, users.manager, draft.id, {
    expectedRevision: attached.revision
  })
  const final = await mutateResponse(db, orgId, users.manager, draft.id, 'submit', {
    expectedRevision: attached.revision,
    balanceRevision: check.balanceRevision,
    warningsAcknowledged: true
  })
  const submissionId = decodePublicId(final.response.submissionId!, 'response')
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
    removeAttachment(db, orgId, users.manager, draft.id, file.id, {
      expectedRevision: final.response.revision
    })
  ).rejects.toMatchObject({ statusCode: 409 })
  await structure.publishCall(db, actor, callId, { published: false })
  expect((await getResponse(db, orgId, users.viewer, draft.id)).response.status).toBe('submitted')
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
      users.contributor,
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
  const during = await getResponse(db, orgId, users.viewer, draft.id)
  expect(during.attachments[0]!.status).toBe('pending')
  await expect(
    checkResponse(db, orgId, users.manager, draft.id, {
      expectedRevision: during.response.revision
    })
  ).rejects.toMatchObject({ statusCode: 409 })
  finish()
  const completed = await pending
  const removed = await removeAttachment(
    db,
    orgId,
    users.contributor,
    draft.id,
    completed.attachments[0]!.id,
    { expectedRevision: completed.revision }
  )
  expect(removed.attachments).toEqual([])
  await expect(
    organizationAttachment(db, orgId, users.viewer, draft.id, completed.attachments[0]!.id, storage)
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
  const failed = await getResponse(db, orgId, users.viewer, draft.id)
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
  expect((await getResponse(db, orgId, users.viewer, draft.id)).attachments).toEqual([])
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
  const revision = (await db.selectFrom('funding_call').select('revision').where('id', '=', callId)
    .executeTakeFirstOrThrow()).revision
  await structure.publishCall(db, actor, callId, { published: false })
  await expect(save(draft.id, 1)).rejects.toMatchObject({ statusCode: 409 })
  await structure.saveCall(
    db,
    actor,
    { streamId, ...names, startDate: '2020-01-01', endDate: '2021-12-31', expectedRevision: revision },
    callId
  )
  await structure.publishCall(db, actor, callId, { published: true })
  await expect(start(callId)).rejects.toMatchObject({ statusCode: 409 })
  await expect(save(draft.id, 1)).rejects.toMatchObject({ statusCode: 409 })
  await expect(
    mutateResponse(db, orgId, users.contributor, draft.id, 'delete', { expectedRevision: 1 })
  ).rejects.toMatchObject({ statusCode: 403 })
  await mutateResponse(db, orgId, users.manager, draft.id, 'delete', { expectedRevision: 1 })
  await expect(getResponse(db, orgId, users.viewer, draft.id)).rejects.toMatchObject({
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
    const foreignOrg = decodePublicId(
      (await portal.createOrganization(db, users.owner, { name: 'Other organization' }))
        .organization.id,
      'organization'
    )
    await expect(
      organizationAttachment(
        db,
        foreignOrg,
        users.owner,
        draft.id,
        result.attachments[0]!.id,
        storage
      )
    ).rejects.toMatchObject({ statusCode: 404 })
    // Even the correct uploader cannot download an attachment under a different response.
    const another = await start(await createCall())
    await expect(
      organizationAttachment(
        db,
        orgId,
        users.contributor,
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
