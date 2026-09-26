import { attachmentConfig } from './attachment-config'
import { attachmentMetadata } from './attachment-records'
import { responseRow, createResponseDraft } from './response-records'
import { requireResponsePublication } from './response-publication'
import type { LineBalance } from '../../shared/types/agreements'
import { agreementRow } from './agreements'
import { currentBalances, balanceWarnings } from './agreement-balances'
import { sql, type Kysely, type Selectable } from 'kysely'
import {
  responseInput,
  startResponseInput,
  versionInput,
  submitResponseInput,
  responseSubjects,
  submissionStatusInput,
  submissionDetailInput,
  documentationAttachmentItemId
} from '../../shared/schemas/agreements'
import type { Database } from '../db/schema'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { lockOrganization, requireBusinessAccess } from './agreement-access'
import { hasAccess, type AccessLevel } from '../../shared/utils/permissions'
import {
  organizationCode,
  primaryResponseCode,
  publicCode,
  responseCodes
} from '../../shared/utils/response-code'
import { setRow } from './submission-sets'
import { validateResponseItems } from './response-validation'
import { buildSubmissionExport } from './submission-export'
const map = (row: Selectable<Database['set_response']>) => ({
  id: row.id,
  setId: row.setId,
  setRevision: row.setRevision,
  organizationId: row.organizationId,
  snapshot: row.snapshot,
  items: row.items,
  forecastIterations: row.forecastIterations,
  locale: row.locale,
  revision: row.revision,
  status: row.status,
  gcsStatus: row.gcsStatus,
  submissionId:
    row.status === 'draft'
      ? null
      : primaryResponseCode(
          row.id,
          row.snapshot.items.map((entry) => entry.item.kind)
        ),
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date(row.updatedAt).toISOString(),
  submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null
})
const submissionDetails = async (db: GovernmentDb, responseId: number) =>
  (
    await db
      .selectFrom('submission_detail')
      .select(['id', 'body', 'attachmentIds', 'createdAt'])
      .where('responseId', '=', responseId)
      .orderBy('createdAt')
      .orderBy('id')
      .execute()
  ).map((entry) => ({ ...entry, createdAt: new Date(entry.createdAt).toISOString() }))
export const getResponse = async (
  db: GovernmentDb,
  organizationId: number,
  userId: number,
  id: number
) => {
  const row = await responseRow(db, organizationId, id)
  await requireBusinessAccess(db, organizationId, userId, responseSubjects(row.snapshot), 'viewer')
  return {
    response: map(row),
    attachments: await attachmentMetadata(db, row.id),
    details: await submissionDetails(db, row.id),
    attachmentLimits: attachmentConfig(),
    balances: await currentBalances(db, row.snapshot),
    submittedBalances:
      row.status !== 'draft' ? (row.export!.balancesAtSubmission as LineBalance[]) : null
  }
}
export const listResponses = async (db: GovernmentDb, organizationId: number, userId: number) => {
  const permissions = await requireBusinessAccess(db, organizationId, userId, [], 'viewer')
  const rows = await db
    .selectFrom('set_response')
    .selectAll()
    .where('organizationId', '=', organizationId)
    .orderBy('createdAt', 'desc')
    .execute()
  return {
    responses: rows
      .filter((row) =>
        responseSubjects(row.snapshot).every((subject) => hasAccess(permissions, subject))
      )
      .map((row) => {
        const claims = row.items.filter((item) => item.kind === 'claim')
        const forecasts = row.snapshot.items.filter((entry) => entry.item.kind === 'forecast')
        const claim = claims.length === 1 ? claims[0]! : null
        const forecast = forecasts.length === 1 ? forecasts[0]!.item : null
        const fiscalYearId = forecast?.kind === 'forecast' ? forecast.fiscalYearId : null
        const fiscalYear = row.snapshot.agreement?.config.fiscalYears.find(
          (year) => year.id === fiscalYearId
        )
        return {
          id: row.id,
          codes: responseCodes(
            row.id,
            row.snapshot.items.map((entry) => entry.item.kind)
          ),
          setId: row.setId,
          callId: row.snapshot.application?.callId ?? null,
          agreementId: row.snapshot.agreementReference?.id ?? null,
          kinds: [...new Set(row.snapshot.items.map((item) => item.item.kind))],
          claimPeriodStart: claim?.periodStart ?? null,
          claimPeriodEnd: claim?.periodEnd ?? null,
          finalClaim: claim?.isFinalForYear ?? null,
          forecastFiscalYear: fiscalYear?.startYear ?? null,
          forecastIteration: fiscalYearId ? (row.forecastIterations[fiscalYearId] ?? null) : null,
          nameEn: row.snapshot.nameEn,
          nameFr: row.snapshot.nameFr,
          status: row.status,
          gcsStatus: row.gcsStatus,
          submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
          updatedAt: new Date(row.updatedAt).toISOString()
        }
      })
  }
}
export const startResponse = async (
  db: Kysely<Database>,
  organizationId: number,
  userId: number,
  setId: number,
  body: unknown
) => {
  const input = startResponseInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    const set = await setRow(tx, setId)
    if (set.organizationId !== organizationId || !set.published || !set.snapshot)
      return fail(404, 'SET_NOT_FOUND')
    await requireBusinessAccess(
      tx,
      organizationId,
      userId,
      responseSubjects(set.snapshot),
      'contributor'
    )
    await requireResponsePublication(tx, set.id, set.snapshot)
    const id = await createResponseDraft(tx, set, userId, input.locale)
    return getResponse(tx, organizationId, userId, id)
  })
}
export const mutateResponse = async (
  db: Kysely<Database>,
  organizationId: number,
  userId: number,
  id: number,
  mode: 'save' | 'submit' | 'delete',
  body: unknown
) => {
  const savedInput = mode === 'save' ? responseInput.parse(body) : null
  const submit = mode === 'submit' ? submitResponseInput.parse(body) : null
  const input = savedInput ?? submit ?? versionInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    const row = await tx
      .selectFrom('set_response')
      .selectAll()
      .where('id', '=', id)
      .where('organizationId', '=', organizationId)
      .forUpdate()
      .executeTakeFirst()
    if (!row) return fail(404, 'RESPONSE_NOT_FOUND')
    const level: AccessLevel = mode === 'save' ? 'contributor' : 'manager'
    await requireBusinessAccess(tx, organizationId, userId, responseSubjects(row.snapshot), level)
    if (row.status !== 'draft') return fail(409, 'RESPONSE_FINAL')
    if (row.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
    if (mode === 'delete') {
      await tx.deleteFrom('set_response').where('id', '=', id).execute()
      return { success: true }
    }
    await requireResponsePublication(tx, row.setId, row.snapshot)
    const items = validateResponseItems(
      row.snapshot,
      savedInput?.items ?? row.items,
      mode === 'save' ? 'draft' : 'submit'
    )
    if (
      mode === 'submit' &&
      (await attachmentMetadata(tx, row.id)).some((file) => file.status !== 'ready')
    )
      return fail(409, 'ATTACHMENTS_PENDING')
    const now = new Date()
    if (mode === 'save')
      await tx
        .updateTable('set_response')
        .set({
          items: sql`${JSON.stringify(items)}::jsonb`,
          revision: row.revision + 1,
          updatedBy: userId,
          updatedAt: now
        })
        .where('id', '=', id)
        .execute()
    else {
      const submissionId = primaryResponseCode(
        row.id,
        row.snapshot.items.map((entry) => entry.item.kind)
      )
      const balanceRevision = row.snapshot.agreement
        ? (await agreementRow(tx, row.snapshot.agreement.id)).revision
        : null
      if (submit!.balanceRevision !== balanceRevision) return fail(409, 'BALANCE_CHANGED')
      const balances = await currentBalances(tx, row.snapshot)
      const warnings = balanceWarnings(items, balances)
      if (warnings.length && !submit!.warningsAcknowledged)
        return fail(409, 'BALANCE_CONFIRMATION_REQUIRED')
      const organization = await tx
        .selectFrom('organization')
        .select('id')
        .where('id', '=', organizationId)
        .executeTakeFirstOrThrow()
      const payload = {
        ...buildSubmissionExport({
          submissionId,
          responseId: submissionId,
          setId: publicCode(row.setId, 'S'),
          setRevision: row.setRevision,
          organizationId: organizationCode(organization.id),
          locale: row.locale,
          submittedAt: now.toISOString(),
          snapshot: row.snapshot,
          items,
          forecastIterations: row.forecastIterations
        }),
        attachments: await attachmentMetadata(tx, row.id),
        balanceRevision,
        balancesAtSubmission: balances,
        balanceWarnings: warnings
      }
      await tx
        .updateTable('set_response')
        .set({
          items: sql`${JSON.stringify(items)}::jsonb`,
          status: 'submitted',
          revision: row.revision + 1,
          updatedBy: userId,
          submittedBy: userId,
          updatedAt: now,
          submittedAt: now,
          export: sql`${JSON.stringify(payload)}::jsonb`
        })
        .where('id', '=', id)
        .execute()
    }
    return getResponse(tx, organizationId, userId, id)
  })
}
export const listSubmissions = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  agencyId: number,
  offset: number
) => {
  await requireGovernment(db, actor, { agencyId })
  const rows = await db
    .selectFrom('set_response as r')
    .innerJoin('submission_set as s', 's.id', 'r.setId')
    .innerJoin('organization as o', 'o.id', 'r.organizationId')
    .select([
      sql<string>`r.snapshot->>'nameEn'`.as('nameEn'),
      sql<string>`r.snapshot->>'nameFr'`.as('nameFr'),
      'o.name as organizationName',
      'r.revision',
      'r.status',
      'r.gcsStatus',
      'r.id as responseId',
      'r.snapshot',
      'r.setId',
      's.agreementId',
      's.callId',
      'r.organizationId',
      'r.submittedAt'
    ])
    .where('s.agencyId', '=', agencyId)
    .where('r.status', 'in', ['submitted', 'awaiting_documentation'])
    .orderBy('r.submittedAt')
    .orderBy('r.id')
    .offset(offset)
    .limit(51)
    .execute()
  return {
    submissions: rows.slice(0, 50).map(({ snapshot, ...row }) => ({
      ...row,
      submissionId: primaryResponseCode(
        row.responseId,
        snapshot.items.map((entry) => entry.item.kind)
      ),
      submittedAt: new Date(row.submittedAt!).toISOString()
    })),
    nextOffset: rows.length > 50 ? offset + 50 : null
  }
}
export const exportSubmission = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  submissionId: number
) => {
  const row = await db
    .selectFrom('set_response as r')
    .innerJoin('submission_set as s', 's.id', 'r.setId')
    .select(['s.agencyId', 'r.export'])
    .where('r.id', '=', submissionId)
    .where('r.status', 'in', ['submitted', 'awaiting_documentation'])
    .executeTakeFirst()
  if (!row) return fail(404, 'RESPONSE_NOT_FOUND')
  await requireGovernment(db, actor, { agencyId: row.agencyId })
  return { submission: row.export }
}

export const checkResponse = async (
  db: Kysely<Database>,
  organizationId: number,
  userId: number,
  id: number,
  body: unknown
) => {
  const input = versionInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    const row = await responseRow(tx, organizationId, id)
    await requireBusinessAccess(
      tx,
      organizationId,
      userId,
      responseSubjects(row.snapshot),
      'manager'
    )
    if (row.status !== 'draft' || row.revision !== input.expectedRevision)
      return fail(409, 'REVISION_CONFLICT')
    await requireResponsePublication(tx, row.setId, row.snapshot)
    const items = validateResponseItems(row.snapshot, row.items, 'submit')
    if ((await attachmentMetadata(tx, row.id)).some((file) => file.status !== 'ready'))
      return fail(409, 'ATTACHMENTS_PENDING')
    const balances = await currentBalances(tx, row.snapshot)
    return {
      balanceRevision: row.snapshot.agreement
        ? (await agreementRow(tx, row.snapshot.agreement.id)).revision
        : null,
      balances,
      warnings: balanceWarnings(items, balances)
    }
  })
}

export const governmentResponse = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  submissionId: number
) => {
  const parent = await db
    .selectFrom('set_response as r')
    .innerJoin('submission_set as s', 's.id', 'r.setId')
    .innerJoin('organization as o', 'o.id', 'r.organizationId')
    .select(['r.id', 's.agencyId', 'o.id as organizationId', 'o.name as organizationName'])
    .where('r.id', '=', submissionId)
    .where('r.status', 'in', ['submitted', 'awaiting_documentation'])
    .executeTakeFirst()
  if (!parent) return fail(404, 'RESPONSE_NOT_FOUND')
  await requireGovernment(db, actor, { agencyId: parent.agencyId })
  const row = await db
    .selectFrom('set_response')
    .selectAll()
    .where('id', '=', parent.id)
    .executeTakeFirstOrThrow()
  const details = await submissionDetails(db, row.id)
  const sentIds = new Set(details.flatMap((detail) => detail.attachmentIds))
  return {
    organization: { id: parent.organizationId, name: parent.organizationName },
    response: map(row),
    attachments: (await attachmentMetadata(db, row.id)).filter(
      (file) => file.itemId !== documentationAttachmentItemId || sentIds.has(file.id)
    ),
    details,
    attachmentLimits: attachmentConfig(),
    balances: row.export!.balancesAtSubmission as LineBalance[],
    submittedBalances: row.export!.balancesAtSubmission as LineBalance[]
  }
}

/** Government review metadata is separate from the immutable submission export. */
export const updateSubmissionStatus = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  submissionId: number,
  body: unknown
) => {
  const input = submissionStatusInput.parse(body)
  const parent = await db
    .selectFrom('set_response as r')
    .innerJoin('submission_set as s', 's.id', 'r.setId')
    .select(['r.id', 'r.organizationId', 's.agencyId'])
    .where('r.id', '=', submissionId)
    .executeTakeFirst()
  if (!parent) return fail(404, 'RESPONSE_NOT_FOUND')
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: parent.agencyId, lock: true })
    await lockOrganization(tx, parent.organizationId)
    const row = await tx
      .selectFrom('set_response')
      .selectAll()
      .where('id', '=', parent.id)
      .forUpdate()
      .executeTakeFirstOrThrow()
    if (row.status === 'draft') return fail(409, 'RESPONSE_NOT_SUBMITTED')
    if (row.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
    const updatedAt = new Date()
    await tx
      .updateTable('set_response')
      .set({
        status: input.status,
        gcsStatus: input.gcsStatus ? sql`${JSON.stringify(input.gcsStatus)}::jsonb` : null,
        revision: row.revision + 1,
        updatedAt
      })
      .where('id', '=', row.id)
      .execute()
    if (input.status === 'submitted') {
      const sentIds = new Set(
        (await submissionDetails(tx, row.id)).flatMap((detail) => detail.attachmentIds)
      )
      const pending = await tx
        .selectFrom('response_attachment')
        .select('id')
        .where('responseId', '=', row.id)
        .where('itemId', '=', documentationAttachmentItemId)
        .execute()
      const unused = pending.filter((file) => !sentIds.has(file.id)).map((file) => file.id)
      if (unused.length)
        await tx
          .updateTable('response_attachment')
          .set({ responseId: null })
          .where('id', 'in', unused)
          .execute()
    }
    return {
      response: map({
        ...row,
        status: input.status,
        gcsStatus: input.gcsStatus,
        revision: row.revision + 1,
        updatedAt
      })
    }
  })
}

/** Applicant follow-ups append evidence without changing the submitted answer or export. */
export const addSubmissionDetail = async (
  db: Kysely<Database>,
  organizationId: number,
  userId: number,
  responseId: number,
  body: unknown
) => {
  const input = submissionDetailInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    const row = await tx
      .selectFrom('set_response')
      .selectAll()
      .where('id', '=', responseId)
      .where('organizationId', '=', organizationId)
      .forUpdate()
      .executeTakeFirst()
    if (!row) return fail(404, 'RESPONSE_NOT_FOUND')
    await requireBusinessAccess(
      tx,
      organizationId,
      userId,
      responseSubjects(row.snapshot),
      'contributor'
    )
    if (row.status !== 'awaiting_documentation') return fail(409, 'DOCUMENTATION_NOT_REQUESTED')
    if (row.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
    if (new Set(input.attachmentIds).size !== input.attachmentIds.length)
      return fail(400, 'INVALID_INPUT')
    const attachments = await tx
      .selectFrom('response_attachment')
      .select(['id', 'status', 'itemId'])
      .where('responseId', '=', responseId)
      .where('id', 'in', input.attachmentIds)
      .execute()
    if (
      attachments.length !== input.attachmentIds.length ||
      attachments.some(
        (file) => file.status !== 'ready' || file.itemId !== documentationAttachmentItemId
      )
    )
      return fail(400, 'INVALID_INPUT')
    const prior = await submissionDetails(tx, responseId)
    if (input.attachmentIds.some((id) => prior.some((detail) => detail.attachmentIds.includes(id))))
      return fail(409, 'ATTACHMENT_ALREADY_SENT')
    await tx
      .insertInto('submission_detail')
      .values({
        responseId,
        body: input.body,
        attachmentIds: sql`${JSON.stringify(input.attachmentIds)}::jsonb`,
        createdBy: userId,
        createdAt: new Date()
      })
      .execute()
    await tx
      .updateTable('set_response')
      .set({ revision: row.revision + 1, updatedBy: userId, updatedAt: new Date() })
      .where('id', '=', responseId)
      .execute()
    return getResponse(tx, organizationId, userId, responseId)
  })
}
