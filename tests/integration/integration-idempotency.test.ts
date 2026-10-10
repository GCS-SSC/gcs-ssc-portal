import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { Kysely } from 'kysely'
import pg from 'pg'
import type { Database } from '../../server/db/schema'
import { pgliteDialect } from '../../server/db/pglite-dialect'
import { migrate } from '../../server/db/migrations'
import { createDatabase } from '../../server/utils/database'
import { createAdministrator } from '../../server/utils/administrator-accounts'
import { createAgency, createProgram, createStream } from '../../server/utils/government-structure'
import { createToken, replaceToken, revokeToken } from '../../server/utils/government-admin'
import { secretHash, type GovernmentActor } from '../../server/utils/government-access'
import { createOrganization, updatePermissions } from '../../server/utils/portal'
import { decodePublicId, encodePublicId } from '../../server/utils/public-identifiers'
import { executeIdempotentGovernmentMutation } from '../../server/utils/integration-idempotency'
import { createSurvey } from '../../server/utils/surveys'
import { startResponse, mutateResponse } from '../../server/utils/set-responses'
import handler from '../../server/api/government/[...path]'

vi.mock('../../server/utils/database', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../server/utils/database')>(),
  useDatabase: async () => db
}))

let db: Kysely<Database>, server: Server, origin: string
let root: GovernmentActor, agencyId: number, otherAgencyId: number, streamId: number
let token: string, secondToken: string, otherToken: string, ownerId: number, organizationId: number
const names = { nameEn: 'Replay agency', nameFr: 'Organisme de reprise' }
const definition = {
  schemaVersion: 1 as const,
  title: { en: 'Project', fr: 'Projet' },
  questions: [{ id: 'name', type: 'text' as const, label: { en: 'Name', fr: 'Nom' }, required: true }]
}
const surveyBody = () => ({ agencyId: encodePublicId(agencyId, 'agency'), definition })
const request = async (
  path: string, method = 'GET', body?: object | string, key?: string, credential = token
) => {
  const response = await fetch(`${origin}/api/government/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${credential}`,
      ...(key !== undefined ? { 'Idempotency-Key': key } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  })
  return { status: response.status, body: await response.json() }
}

beforeAll(async () => {
  const url = process.env.PORTAL_TEST_DATABASE_URL
  if (url) {
    if (!new URL(url).pathname.endsWith('_test')) throw new Error('Disposable test database required')
    const guard = new pg.Client({ connectionString: url })
    await guard.connect()
    try {
      if ((await guard.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1")).rowCount)
        throw new Error('Refusing a nonempty database')
    } finally { await guard.end() }
  }
  db = await createDatabase({ url })
  const administrator = await createAdministrator(db, {
    name: 'Replay administrator', email: 'replay-admin@example.test', password: 'Replay-admin-test-2026!'
  })
  root = { kind: 'administrator', administratorId: administrator.id }
  agencyId = (await createAgency(db, root, names)).agency.id
  otherAgencyId = (await createAgency(db, root, names)).agency.id
  token = (await createToken(db, root, { agencyId, name: 'First' })).token
  secondToken = (await createToken(db, root, { agencyId, name: 'Second' })).token
  otherToken = (await createToken(db, root, { agencyId: otherAgencyId, name: 'Other' })).token
  const programId = (await createProgram(db, root, { agencyId, ...names })).program.id
  streamId = (await createStream(db, root, { programId, ...names })).stream.id
  ownerId = (await db.insertInto('user').values({
    name: 'Applicant', email: 'replay-owner@example.test', emailVerified: false,
    image: null, createdAt: new Date(), updatedAt: new Date()
  }).returning('id').executeTakeFirstOrThrow()).id
  organizationId = decodePublicId((await createOrganization(db, ownerId, { name: 'Replay organization' })).organization.id, 'organization')
  await updatePermissions(db, organizationId, ownerId, ownerId, {
    permissions: ['user', 'admin', 'form:manager']
  })
  server = createServer(toNodeListener(createApp().use(handler)))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test address')
  origin = `http://127.0.0.1:${address.port}`
}, 60000)

afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  await db?.destroy()
})

it('replays an uncertain survey create and revision update with the original public response', async () => {
  const created = await request('surveys', 'POST', surveyBody(), 'survey-create')
  expect(created.status).toBe(200)
  const id = created.body.survey.id
  expect(id).toMatch(/^V-/)
  expect(await request('surveys', 'POST', surveyBody(), 'survey-create')).toEqual(created)
  expect(await db.selectFrom('survey').select('id').execute()).toHaveLength(1)
  const update = { expectedRevision: 1, definition: { ...definition, title: { en: 'Updated', fr: 'Modifié' } } }
  const updated = await request(`surveys/${id}`, 'PUT', update, 'survey-update')
  expect(updated.body.survey.revision).toBe(2)
  expect((await request(`surveys/${id}`, 'PUT', { ...update, expectedRevision: 2 }, 'survey-update-next')).status).toBe(200)
  expect(await request(`surveys/${id}`, 'PUT', update, 'survey-update')).toEqual(updated)
  expect((await request(`surveys/${id}`)).body.survey.revision).toBe(3)
  expect((await request(`surveys/${id}`, 'PUT', update, 'survey-stale')).status).toBe(409)
  expect(await db.selectFrom('integration_request').select('key').where('key', '=', 'survey-stale').execute()).toEqual([])
})

it('serializes the same key across distinct agency credentials and rejects changed bytes, path or method', async () => {
  const before = (await db.selectFrom('survey').select('id').execute()).length
  const input = surveyBody()
  const [first, replay] = await Promise.all([
    request('surveys', 'POST', input, 'parallel-create'),
    request('surveys', 'POST', input, 'parallel-create', secondToken)
  ])
  expect(first.status).toBe(200)
  expect(replay).toEqual(first)
  expect(await db.selectFrom('survey').select('id').execute()).toHaveLength(before + 1)
  const reordered = JSON.stringify({ definition: input.definition, agencyId: input.agencyId })
  expect((await request('surveys', 'POST', reordered, 'parallel-create')).body.data.code).toBe('IDEMPOTENCY_KEY_CONFLICT')
  expect((await request(`surveys/${first.body.survey.id}`, 'PUT', input, 'parallel-create')).status).toBe(409)
  expect((await request('surveys', 'PATCH', input, 'parallel-create')).status).toBe(409)
  expect((await request('surveys?changed=1', 'POST', input, 'parallel-create')).status).toBe(409)
  expect((await request('surveys?value=1', 'POST', input, 'query-boundary')).status).toBe(200)
  expect((await request('surveys%3Fvalue=1', 'POST', input, 'query-boundary')).status).toBe(409)
  const beforeConflict = (await db.selectFrom('survey').select('id').execute()).length
  const conflict = await Promise.all([
    request('surveys', 'POST', input, 'parallel-conflict'),
    request('surveys', 'POST', { ...input, definition: { ...definition, title: { en: 'Other', fr: 'Autre' } } }, 'parallel-conflict', secondToken)
  ])
  expect(conflict.map(result => result.status).sort()).toEqual([200, 409])
  expect(await db.selectFrom('survey').select('id').execute()).toHaveLength(beforeConflict + 1)
})

it('rolls back both the mutation and replay row on failure, and permits a corrected retry', async () => {
  const actor: GovernmentActor = { kind: 'integration', tokenHash: secretHash(token) }
  const input = surveyBody()
  const command = { key: 'rollback', method: 'POST', path: ['surveys'], query: '', body: new TextEncoder().encode(JSON.stringify(input)) }
  const before = (await db.selectFrom('survey').select('id').execute()).length
  await expect(executeIdempotentGovernmentMutation(db, actor, command, async transaction => {
    await createSurvey(transaction, actor, { agencyId, definition })
    throw new Error('Process failed before committing the response')
  })).rejects.toThrow('Process failed before committing the response')
  expect(await db.selectFrom('survey').select('id').execute()).toHaveLength(before)
  expect(await db.selectFrom('integration_request').select('key').where('key', '=', 'rollback').execute()).toEqual([])
  expect((await request('surveys', 'POST', input, 'rollback')).status).toBe(200)
  expect((await request('surveys', 'POST', {}, 'validation-retry')).status).toBe(400)
  expect((await request('surveys', 'POST', input, 'validation-retry')).status).toBe(200)
  expect((await request('surveys', 'POST', input, 'invalid key')).body.data.code).toBe('INVALID_IDEMPOTENCY_KEY')
  expect((await request('surveys', 'POST', input, 'x'.repeat(201))).status).toBe(400)
})

it('isolates agency keys, honors rotation and revocation, and preserves unkeyed requests', async () => {
  const input = surveyBody()
  const created = await request('surveys', 'POST', input, 'agency-scope')
  const other = await request('surveys', 'POST', {
    ...input, agencyId: encodePublicId(otherAgencyId, 'agency')
  }, 'agency-scope', otherToken)
  expect(other.status).toBe(200)
  expect(other.body.survey.id).not.toBe(created.body.survey.id)
  expect((await request('surveys', 'POST', input, 'forbidden-agency', otherToken)).status).toBe(404)
  const issued = await createToken(db, root, { agencyId, name: 'Rotating' })
  const initial = await request('surveys', 'POST', input, 'rotation', issued.token)
  const replacement = await replaceToken(db, root, issued.id)
  expect((await request('surveys', 'POST', input, 'rotation', issued.token)).status).toBe(401)
  expect(await request('surveys', 'POST', input, 'rotation', replacement.token)).toEqual(initial)
  await revokeToken(db, root, issued.id)
  expect((await request('surveys', 'POST', input, 'rotation', replacement.token)).status).toBe(401)
  const expiring = await createToken(db, root, { agencyId, name: 'Expiring' })
  expect((await request('surveys', 'POST', input, 'expiry', expiring.token)).status).toBe(200)
  await db.updateTable('integration_token').set({ expiresAt: new Date(0) }).where('id', '=', expiring.id).execute()
  expect((await request('surveys', 'POST', input, 'expiry', expiring.token)).status).toBe(401)
  const withoutKey = await request('surveys', 'POST', input)
  expect(withoutKey.status).toBe(200)
  expect((await request('surveys', 'POST', input)).body.survey.id).not.toBe(withoutKey.body.survey.id)
  const foreignOrigin = await fetch(`${origin}/api/government/surveys`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': 'agency-scope', Origin: 'https://foreign.example' },
    body: JSON.stringify(input)
  })
  expect(foreignOrigin.status).toBe(403)
})

it('adds the ledger to a populated previous schema without changing existing rows', async () => {
  const previous = new Kysely<Database>({ dialect: pgliteDialect('memory://') })
  try {
    await migrate(previous, '016_call_forms')
    const administrator = await createAdministrator(previous, {
      name: 'Migration administrator', email: 'migration-replay@example.test', password: 'Migration-replay-test-2026!'
    })
    const actor: GovernmentActor = { kind: 'administrator', administratorId: administrator.id }
    const existing = (await createAgency(previous, actor, names)).agency
    await migrate(previous)
    expect(await previous.selectFrom('agency').selectAll().execute()).toMatchObject([{ id: existing.id, ...names }])
    expect(await previous.selectFrom('integration_request').selectAll().execute()).toEqual([])
    await migrate(previous)
  } finally { await previous.destroy() }
})

it('replays call creation, metadata changes and ordered form assignment without advancing twice', async () => {
  const input = { ...names, streamId: encodePublicId(streamId, 'stream'), startDate: '2020-01-01', endDate: '2099-12-31' }
  const created = await request('calls', 'POST', input, 'call-create')
  expect(created.status).toBe(200)
  expect(await request('calls', 'POST', input, 'call-create')).toEqual(created)
  const id = created.body.id
  const update = { ...input, expectedRevision: 1, nameEn: 'Updated call' }
  expect((await request(`calls/${id}`, 'PUT', update, 'call-update')).status).toBe(200)
  expect((await request(`calls/${id}`, 'PUT', update, 'call-update')).status).toBe(200)
  const survey = (await request('surveys', 'POST', surveyBody(), 'call-form')).body.survey
  const forms = { forms: [{ surveyId: survey.id, revision: survey.revision }] }
  expect((await request(`calls/${id}/forms`, 'PUT', forms, 'call-forms')).status).toBe(200)
  expect((await request(`calls/${id}/forms`, 'PUT', forms, 'call-forms')).status).toBe(200)
  const call = await db.selectFrom('funding_call').selectAll().where('id', '=', decodePublicId(id, 'call')).executeTakeFirstOrThrow()
  expect(call.revision).toBe(3)
  const published = await request(`calls/${id}/publication`, 'PATCH', { published: true }, 'call-publish')
  expect(published.status).toBe(200)
  expect(await request(`calls/${id}/publication`, 'PATCH', { published: true }, 'call-publish')).toEqual(published)
})

it('replays set publication, item outcomes and import acknowledgements while keeping the original export', async () => {
  const survey = (await request('surveys', 'POST', surveyBody(), 'set-survey')).body.survey
  const input = {
    ...names, agencyId: encodePublicId(agencyId, 'agency'), organizationId: encodePublicId(organizationId, 'organization'),
    agreementId: null, items: [{ id: 'form', kind: 'survey', surveyId: survey.id, surveyRevision: survey.revision }]
  }
  const created = await request('sets', 'POST', input, 'set-create')
  expect(created.status).toBe(200)
  expect(await request('sets', 'POST', input, 'set-create')).toEqual(created)
  const set = created.body.set
  const published = await request(`sets/${set.id}/publish`, 'POST', { expectedRevision: set.revision }, 'set-publish')
  expect(published.status).toBe(200)
  expect(await request(`sets/${set.id}/publish`, 'POST', { expectedRevision: set.revision }, 'set-publish')).toEqual(published)
  const draft = (await startResponse(db, organizationId, ownerId, decodePublicId(set.id, 'set'), { locale: 'en' })).response
  const saved = (await mutateResponse(db, organizationId, ownerId, draft.id, 'save', {
    expectedRevision: draft.revision, items: [{ id: 'form', kind: 'survey', answers: { name: 'Immutable applicant answer' } }]
  })).response
  await mutateResponse(db, organizationId, ownerId, draft.id, 'submit', {
    expectedRevision: saved.revision, balanceRevision: null, warningsAcknowledged: true
  })
  const updates = (await request(`agencies/${encodePublicId(agencyId, 'agency')}/updates`)).body.updates
  expect(updates).toHaveLength(1)
  const event = updates[0]
  const before = await request(`submissions/${event.submissionId}`)
  const outcomePath = `submissions/${event.submissionId}/items/${event.itemSubmissionId}/outcome`
  const outcome = { expectedRevision: 0, remoteReference: 'gcs-record-100', gcsStatus: null }
  const delivered = await request(outcomePath, 'PUT', outcome, 'outcome-reference')
  expect(delivered.status).toBe(200)
  expect(await request(outcomePath, 'PUT', outcome, 'outcome-reference')).toEqual(delivered)
  const reviewed = { expectedRevision: 1, remoteReference: 'gcs-record-100', gcsStatus: { en: 'Reviewed', fr: 'Examiné', colour: '#123456' } }
  const status = await request(outcomePath, 'PUT', reviewed, 'outcome-status')
  expect(status.status).toBe(200)
  expect(await request(outcomePath, 'PUT', reviewed, 'outcome-status')).toEqual(status)
  const consumePath = `agencies/${encodePublicId(agencyId, 'agency')}/updates/${event.eventId}/consume`
  const receipt = await request(consumePath, 'POST', { remoteReference: 'gcs-record-100' }, 'consume')
  expect(receipt.status).toBe(200)
  expect(await request(consumePath, 'POST', { remoteReference: 'gcs-record-100' }, 'consume')).toEqual(receipt)
  expect((await request(consumePath, 'POST', { remoteReference: 'different' })).status).toBe(409)
  expect((await request(`agencies/${encodePublicId(agencyId, 'agency')}/updates`)).body.updates).toEqual([])
  expect(await request(`submissions/${event.submissionId}`)).toEqual(before)
  const view = (await request(`submissions/${event.submissionId}/response`)).body
  expect(view.outcomes).toMatchObject([{ remoteReference: 'gcs-record-100', revision: 2, gcsStatus: reviewed.gcsStatus }])
  const documentation = {
    expectedRevision: view.response.revision, status: 'awaiting_documentation', gcsStatus: null,
    message: 'Please supply documentation', senderName: 'Reviewer'
  }
  const requested = await request(`submissions/${event.submissionId}/status`, 'PUT', documentation, 'documentation-request')
  expect(requested.status).toBe(200)
  expect(await request(`submissions/${event.submissionId}/status`, 'PUT', documentation, 'documentation-request')).toEqual(requested)
  const detail = { expectedRevision: requested.body.response.revision, body: 'Recorded government reply', senderName: 'Reviewer', attachmentIds: [] }
  const reply = await request(`submissions/${event.submissionId}/details`, 'POST', detail, 'government-reply')
  expect(reply.status).toBe(200)
  expect(await request(`submissions/${event.submissionId}/details`, 'POST', detail, 'government-reply')).toEqual(reply)
  expect(await db.selectFrom('submission_detail').select('id').execute()).toHaveLength(2)
  expect(await request(`submissions/${event.submissionId}`)).toEqual(before)
  expect((await request(`submissions/${event.submissionId}/attachments`, 'POST', {}, 'binary-upload')).body.data.code)
    .toBe('IDEMPOTENCY_UNSUPPORTED')
})
