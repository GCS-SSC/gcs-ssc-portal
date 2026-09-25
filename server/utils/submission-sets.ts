import { sql, type Kysely, type Selectable } from 'kysely'
import { v7 as uuid } from 'uuid'
import {
  setInput,
  setUpdateInput,
  versionInput,
  setSubjects,
  type SetSnapshot
} from '../../shared/schemas/agreements'
import type { Database } from '../db/schema'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { lockOrganization, requireBusinessAccess } from './agreement-access'
import { hasAccess } from '../../shared/utils/permissions'
import { agreementRow } from './agreements'
const map = (row: Selectable<Database['submission_set']>) => ({
  ...row,
  createdAt: new Date(row.createdAt).toISOString()
})
export const setRow = async (db: GovernmentDb, id: string) =>
  (await db.selectFrom('submission_set').selectAll().where('id', '=', id).executeTakeFirst()) ??
  fail(404, 'SET_NOT_FOUND')
export const getSet = async (db: GovernmentDb, actor: GovernmentActor, id: string) => {
  const row = await setRow(db, id)
  await requireGovernment(db, actor, { agencyId: row.agencyId })
  return { set: map(row) }
}
export const listSets = async (db: GovernmentDb, actor: GovernmentActor, agencyId: string) => {
  await requireGovernment(db, actor, { agencyId })
  return {
    sets: (
      await db
        .selectFrom('submission_set')
        .selectAll()
        .where('agencyId', '=', agencyId)
        .where('callId', 'is', null)
        .orderBy('createdAt', 'desc')
        .execute()
    ).map(map)
  }
}
export const saveSet = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  body: unknown,
  id?: string
) => {
  const update = id ? setUpdateInput.parse(body) : null
  const input = update?.value ?? setInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: input.agencyId, lock: true })
    await lockOrganization(tx, input.organizationId)
    if (input.agreementId) {
      const parent = await agreementRow(tx, input.agreementId)
      if (parent.organizationId !== input.organizationId || parent.agencyId !== input.agencyId)
        return fail(404, 'AGREEMENT_NOT_FOUND')
    }
    if (input.foreignSystemId) {
      const duplicate = await tx
        .selectFrom('submission_set')
        .select('id')
        .where('agencyId', '=', input.agencyId)
        .where('sourceSystem', '=', input.sourceSystem)
        .where('foreignSystemId', '=', input.foreignSystemId)
        .executeTakeFirst()
      if (duplicate && duplicate.id !== id) return fail(409, 'EXTERNAL_SET_EXISTS')
    }
    if (id) {
      const previous = await tx
        .selectFrom('submission_set')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst()
      if (!previous || previous.callId || previous.agencyId !== input.agencyId)
        return fail(404, 'SET_NOT_FOUND')
      if (
        previous.organizationId !== input.organizationId ||
        previous.agreementId !== input.agreementId
      )
        return fail(409, 'SET_SCOPE_IMMUTABLE')
      if (
        previous.sourceSystem !== input.sourceSystem ||
        (previous.foreignSystemId && previous.foreignSystemId !== input.foreignSystemId)
      )
        return fail(409, 'EXTERNAL_IDENTITY_IMMUTABLE')
      if (previous.published) return fail(409, 'UNPUBLISH_BEFORE_EDITING')
      if (previous.revision !== update!.expectedRevision) return fail(409, 'REVISION_CONFLICT')
      await tx
        .updateTable('submission_set')
        .set({
          ...input,
          items: sql`${JSON.stringify(input.items)}::jsonb`,
          snapshot: null,
          revision: previous.revision + 1
        })
        .where('id', '=', id)
        .execute()
    } else {
      id = uuid()
      await tx
        .insertInto('submission_set')
        .values({
          ...input,
          id,
          items: sql`${JSON.stringify(input.items)}::jsonb`,
          snapshot: null,
          revision: 1,
          published: false,
          createdAt: new Date()
        })
        .execute()
    }
    return getSet(tx, actor, id)
  })
}
export const publishSet = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  id: string,
  body: unknown,
  published: boolean
) => {
  const input = versionInput.parse(body),
    parent = await setRow(db, id)
  if (parent.callId) return fail(404, 'SET_NOT_FOUND')
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: parent.agencyId, lock: true })
    await lockOrganization(tx, parent.organizationId)
    const row = await tx
      .selectFrom('submission_set')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirstOrThrow()
    if (row.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
    if (published && !row.snapshot) {
      const snapshot: SetSnapshot = {
        schemaVersion: 1,
        publicationId: uuid(),
        agreementReference: null,
        nameEn: row.nameEn,
        nameFr: row.nameFr,
        sourceSystem: row.sourceSystem,
        foreignSystemId: row.foreignSystemId,
        items: [],
        agreement: null
      }
      const hasFinancial = row.items.some((item) => item.kind !== 'survey')
      if (row.agreementId) {
        const owner = await agreementRow(tx, row.agreementId)
        snapshot.agreementReference = {
          id: owner.id,
          agreementNumber: owner.agreementNumber,
          sourceSystem: owner.config.sourceSystem,
          foreignSystemId: owner.config.foreignSystemId,
          externalStreamId: owner.config.externalStreamId,
          externalApplicantRecipientId: owner.config.externalApplicantRecipientId
        }
        if (hasFinancial)
          snapshot.agreement = {
            id: owner.id,
            revision: owner.revision,
            agreementNumber: owner.agreementNumber,
            config: owner.config
          }
      }
      for (const item of row.items) {
        if (item.kind === 'survey') {
          const form = await tx
            .selectFrom('survey_revision as r')
            .innerJoin('survey as s', 's.id', 'r.surveyId')
            .select('r.definition')
            .where('s.agencyId', '=', row.agencyId)
            .where('r.surveyId', '=', item.surveyId)
            .where('r.revision', '=', item.surveyRevision)
            .executeTakeFirst()
          if (!form) return fail(404, 'SURVEY_NOT_FOUND')
          snapshot.items.push({ item, survey: form.definition })
        } else {
          const config = snapshot.agreement?.config
          if (
            !config?.fiscalYears.some((year) => year.id === item.fiscalYearId) ||
            !config.budgetLines.some((line) => line.fiscalYearId === item.fiscalYearId)
          )
            return fail(400, 'BUDGET_REQUIRED')
          snapshot.items.push({ item })
        }
      }
      if (Buffer.byteLength(JSON.stringify(snapshot)) > 3 * 1024 * 1024)
        return fail(400, 'SET_TOO_LARGE')
      await tx
        .updateTable('submission_set')
        .set({ snapshot: sql`${JSON.stringify(snapshot)}::jsonb` })
        .where('id', '=', id)
        .execute()
    }
    await tx
      .updateTable('submission_set')
      .set({ published, revision: row.revision + 1 })
      .where('id', '=', id)
      .execute()
    return getSet(tx, actor, id)
  })
}
export const organizationSets = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string
) => {
  const permissions = await requireBusinessAccess(db, organizationId, userId, [], 'viewer')
  const rows = await db
    .selectFrom('submission_set')
    .selectAll()
    .where('organizationId', '=', organizationId)
    .where('published', '=', true)
    .where('callId', 'is', null)
    .orderBy('createdAt', 'desc')
    .execute()
  return {
    sets: rows
      .filter((row) => setSubjects(row.items).every((subject) => hasAccess(permissions, subject)))
      .map(({ snapshot: _snapshot, ...row }) => ({
        ...row,
        createdAt: new Date(row.createdAt).toISOString()
      }))
  }
}

export const organizationSet = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string,
  id: string
) => {
  const row = await setRow(db, id)
  if (row.callId || row.organizationId !== organizationId || !row.published || !row.snapshot)
    return fail(404, 'SET_NOT_FOUND')
  await requireBusinessAccess(db, organizationId, userId, setSubjects(row.items), 'viewer')
  return { set: map(row) }
}
