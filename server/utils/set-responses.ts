import { attachmentConfig } from './attachment-config'
import { attachmentMetadata } from './attachment-records'
import { responseRow, createResponseDraft } from './response-records'
import { requireResponsePublication } from './response-publication'
import type { LineBalance } from '../../shared/types/agreements'
import { agreementRow } from './agreements'
import { currentBalances, balanceWarnings } from './agreement-balances'
import { sql, type Kysely, type Selectable } from 'kysely'
import { v7 as uuid } from 'uuid'
import {
  responseInput,
  startResponseInput,
  versionInput,
  submitResponseInput,
  responseSubjects
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
  locale: row.locale,
  revision: row.revision,
  status: row.status,
  submissionId: row.submissionId,
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date(row.updatedAt).toISOString(),
  submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null
})
export const getResponse = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string,
  id: string
) => {
  const row = await responseRow(db, organizationId, id)
  await requireBusinessAccess(db, organizationId, userId, responseSubjects(row.snapshot), 'viewer')
  return {
    response: map(row),
    attachments: await attachmentMetadata(db, row.id),
    attachmentLimits: attachmentConfig(),
    balances: await currentBalances(db, row.snapshot),
    submittedBalances:
      row.status === 'submitted' ? (row.export!.balancesAtSubmission as LineBalance[]) : null
  }
}
export const listResponses = async (db: GovernmentDb, organizationId: string, userId: string) => {
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
      .map((row) => ({
        id: row.id,
        setId: row.setId,
        callId: row.snapshot.application?.callId ?? null,
        nameEn: row.snapshot.nameEn,
        nameFr: row.snapshot.nameFr,
        status: row.status,
        submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
        updatedAt: new Date(row.updatedAt).toISOString()
      }))
  }
}
export const startResponse = async (
  db: Kysely<Database>,
  organizationId: string,
  userId: string,
  setId: string,
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
  organizationId: string,
  userId: string,
  id: string,
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
      const submissionId = uuid()
      const balanceRevision = row.snapshot.agreement
        ? (await agreementRow(tx, row.snapshot.agreement.id)).revision
        : null
      if (submit!.balanceRevision !== balanceRevision) return fail(409, 'BALANCE_CHANGED')
      const balances = await currentBalances(tx, row.snapshot)
      const warnings = balanceWarnings(items, balances)
      if (warnings.length && !submit!.warningsAcknowledged)
        return fail(409, 'BALANCE_CONFIRMATION_REQUIRED')
      const payload = {
        ...buildSubmissionExport({
          submissionId,
          responseId: row.id,
          setId: row.setId,
          setRevision: row.setRevision,
          organizationId,
          locale: row.locale,
          submittedAt: now.toISOString(),
          snapshot: row.snapshot,
          items
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
          submissionId,
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
  agencyId: string,
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
      'r.submissionId',
      'r.id as responseId',
      'r.setId',
      's.agreementId',
      's.callId',
      'r.organizationId',
      'r.submittedAt'
    ])
    .where('s.agencyId', '=', agencyId)
    .where('r.status', '=', 'submitted')
    .orderBy('r.submittedAt')
    .orderBy('r.id')
    .offset(offset)
    .limit(51)
    .execute()
  return {
    submissions: rows
      .slice(0, 50)
      .map((row) => ({ ...row, submittedAt: new Date(row.submittedAt!).toISOString() })),
    nextOffset: rows.length > 50 ? offset + 50 : null
  }
}
export const exportSubmission = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  submissionId: string
) => {
  const row = await db
    .selectFrom('set_response as r')
    .innerJoin('submission_set as s', 's.id', 'r.setId')
    .select(['s.agencyId', 'r.export'])
    .where('r.submissionId', '=', submissionId)
    .where('r.status', '=', 'submitted')
    .executeTakeFirst()
  if (!row) return fail(404, 'RESPONSE_NOT_FOUND')
  await requireGovernment(db, actor, { agencyId: row.agencyId })
  return { submission: row.export }
}

export const checkResponse = async (
  db: Kysely<Database>,
  organizationId: string,
  userId: string,
  id: string,
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
  submissionId: string
) => {
  const parent = await db
    .selectFrom('set_response as r')
    .innerJoin('submission_set as s', 's.id', 'r.setId')
    .innerJoin('organization as o', 'o.id', 'r.organizationId')
    .select(['r.id', 's.agencyId', 'o.id as organizationId', 'o.name as organizationName'])
    .where('r.submissionId', '=', submissionId)
    .where('r.status', '=', 'submitted')
    .executeTakeFirst()
  if (!parent) return fail(404, 'RESPONSE_NOT_FOUND')
  await requireGovernment(db, actor, { agencyId: parent.agencyId })
  const row = await db
    .selectFrom('set_response')
    .selectAll()
    .where('id', '=', parent.id)
    .executeTakeFirstOrThrow()
  return {
    organization: { id: parent.organizationId, name: parent.organizationName },
    response: map(row),
    attachments: await attachmentMetadata(db, row.id),
    attachmentLimits: attachmentConfig(),
    balances: row.export!.balancesAtSubmission as LineBalance[],
    submittedBalances: row.export!.balancesAtSubmission as LineBalance[]
  }
}
