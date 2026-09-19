import type { LineBalance } from '../../shared/types/cases'
import { caseRow } from './cases'
import { currentBalances, balanceWarnings } from './case-balances'
import { sql, type Kysely, type Selectable } from 'kysely'
import { v7 as uuid } from 'uuid'
import {
  responseInput,
  startResponseInput,
  versionInput,
  submitResponseInput,
  setSubjects
} from '../../shared/schemas/cases'
import type { Database } from '../db/schema'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { lockOrganization, requireBusinessAccess } from './case-access'
import { hasAccess, type AccessLevel } from '../../shared/utils/permissions'
import { setRow } from './submission-sets'
import { validateResponseItems, initialResponseItems } from './response-validation'
import { buildSubmissionExport } from './submission-export'
const responseRow = async (db: GovernmentDb, organizationId: string, id: string) =>
  (await db
    .selectFrom('set_response')
    .selectAll()
    .where('id', '=', id)
    .where('organizationId', '=', organizationId)
    .executeTakeFirst()) ?? fail(404, 'RESPONSE_NOT_FOUND')
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
  await requireBusinessAccess(
    db,
    organizationId,
    userId,
    setSubjects(row.snapshot.items.map((entry) => entry.item)),
    'viewer'
  )
  return {
    response: map(row),
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
        setSubjects(row.snapshot.items.map((entry) => entry.item)).every((subject) =>
          hasAccess(permissions, subject)
        )
      )
      .map((row) => ({
        id: row.id,
        setId: row.setId,
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
    await requireBusinessAccess(tx, organizationId, userId, setSubjects(set.items), 'contributor')
    const existing = await tx
      .selectFrom('set_response')
      .selectAll()
      .where('setId', '=', setId)
      .where('status', '=', 'draft')
      .executeTakeFirst()
    if (existing) return getResponse(tx, organizationId, userId, existing.id)
    const id = uuid(),
      now = new Date()
    await tx
      .insertInto('set_response')
      .values({
        id,
        setId,
        organizationId,
        setRevision: set.revision,
        snapshot: sql`${JSON.stringify(set.snapshot)}::jsonb`,
        items: sql`${JSON.stringify(initialResponseItems(set.snapshot, input.locale))}::jsonb`,
        locale: input.locale,
        revision: 1,
        status: 'draft',
        createdBy: userId,
        updatedBy: userId,
        submittedBy: null,
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
        submissionId: null,
        export: null
      })
      .execute()
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
    await requireBusinessAccess(
      tx,
      organizationId,
      userId,
      setSubjects(row.snapshot.items.map((entry) => entry.item)),
      level
    )
    if (row.status !== 'draft') return fail(409, 'RESPONSE_FINAL')
    if (row.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
    if (mode === 'delete') {
      await tx.deleteFrom('set_response').where('id', '=', id).execute()
      return { success: true }
    }
    const set = await setRow(tx, row.setId)
    if (!set.published || set.snapshot?.publicationId !== row.snapshot.publicationId)
      return fail(409, 'SET_WITHDRAWN')
    const items = validateResponseItems(
      row.snapshot,
      savedInput?.items ?? row.items,
      mode === 'save' ? 'draft' : 'submit'
    )
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
      const balanceRevision = row.snapshot.case
        ? (await caseRow(tx, row.snapshot.case.id)).revision
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
    .select([
      'r.submissionId',
      'r.id as responseId',
      'r.setId',
      's.caseId',
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
      setSubjects(row.snapshot.items.map((entry) => entry.item)),
      'manager'
    )
    if (row.status !== 'draft' || row.revision !== input.expectedRevision)
      return fail(409, 'REVISION_CONFLICT')
    const active = await setRow(tx, row.setId)
    if (!active.published || active.snapshot?.publicationId !== row.snapshot.publicationId)
      return fail(409, 'SET_WITHDRAWN')
    const items = validateResponseItems(row.snapshot, row.items, 'submit')
    const balances = await currentBalances(tx, row.snapshot)
    return {
      balanceRevision: row.snapshot.case
        ? (await caseRow(tx, row.snapshot.case.id)).revision
        : null,
      balances,
      warnings: balanceWarnings(items, balances)
    }
  })
}
