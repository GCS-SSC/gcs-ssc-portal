import { hasAccess } from '../../shared/utils/permissions'
import { sql, type Kysely } from 'kysely'
import { z } from 'zod'
import { surveySchema } from '@gcs-ssc/survey'
import type { Database } from '../db/schema'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { getPermissions } from './portal'
const createInput = z
  .object({ agencyId: z.number().int().positive(), definition: surveySchema })
  .strict()
const updateInput = z
  .object({ expectedRevision: z.number().int().positive(), definition: surveySchema })
  .strict()
const attachInput = z
  .object({
    surveyId: z.number().int().positive().nullable(),
    revision: z.number().int().positive().nullable()
  })
  .strict()
  .refine((value) => (value.surveyId === null) === (value.revision === null))
const attachFormsInput = z.object({ forms: z.array(z.object({
  surveyId: z.number().int().positive(), revision: z.number().int().positive()
}).strict()).max(10).refine(forms => new Set(forms.map(form => form.surveyId)).size === forms.length) }).strict()
const selectSurvey = (db: GovernmentDb) =>
  db
    .selectFrom('survey as s')
    .innerJoin('survey_revision as r', (join) =>
      join.onRef('s.id', '=', 'r.surveyId').onRef('s.revision', '=', 'r.revision')
    )
    .select(['s.id', 's.agencyId', 's.revision', 's.updatedAt', 'r.definition'])
export const listSurveys = async (db: GovernmentDb, actor: GovernmentActor, agencyId: number) => {
  await requireGovernment(db, actor, { agencyId })
  if (!(await db.selectFrom('agency').select('id').where('id', '=', agencyId).executeTakeFirst()))
    fail(404, 'AGENCY_NOT_FOUND')
  const rows = await selectSurvey(db)
    .where('s.agencyId', '=', agencyId)
    .orderBy('s.updatedAt', 'desc')
    .execute()
  return {
    surveys: rows.map(({ definition, ...row }) => ({
      ...row,
      title: definition.title,
      updatedAt: new Date(row.updatedAt).toISOString()
    }))
  }
}
export const getSurvey = async (db: GovernmentDb, actor: GovernmentActor, id: number) => {
  const row = await selectSurvey(db).where('s.id', '=', id).executeTakeFirst()
  if (!row) return fail(404, 'SURVEY_NOT_FOUND')
  await requireGovernment(db, actor, { agencyId: row.agencyId })
  return { survey: { ...row, updatedAt: new Date(row.updatedAt).toISOString() } }
}
export const createSurvey = async (db: Kysely<Database>, actor: GovernmentActor, body: unknown) => {
  const input = createInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: input.agencyId, lock: true })
    if (
      !(await tx
        .selectFrom('agency')
        .select('id')
        .where('id', '=', input.agencyId)
        .executeTakeFirst())
    )
      return fail(404, 'AGENCY_NOT_FOUND')
    const row = await tx
      .insertInto('survey')
      .values({ agencyId: input.agencyId, revision: 1, updatedAt: new Date() })
      .returningAll()
      .executeTakeFirstOrThrow()
    await tx
      .insertInto('survey_revision')
      .values({
        surveyId: row.id,
        revision: 1,
        definition: sql`${JSON.stringify(input.definition)}::jsonb`,
        createdAt: row.updatedAt
      })
      .execute()
    return getSurvey(tx, actor, row.id)
  })
}
export const updateSurvey = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  id: number,
  body: unknown
) => {
  const input = updateInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const original = await tx
      .selectFrom('survey')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!original) return fail(404, 'SURVEY_NOT_FOUND')
    await requireGovernment(tx, actor, { agencyId: original.agencyId, lock: true })
    const current = await tx
      .selectFrom('survey')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirstOrThrow()
    if (current.revision !== input.expectedRevision) return fail(409, 'SURVEY_REVISION_CONFLICT')
    const revision = current.revision + 1,
      now = new Date()
    await tx
      .insertInto('survey_revision')
      .values({
        surveyId: id,
        revision,
        definition: sql`${JSON.stringify(input.definition)}::jsonb`,
        createdAt: now
      })
      .execute()
    await tx.updateTable('survey').set({ revision, updatedAt: now }).where('id', '=', id).execute()
    return getSurvey(tx, actor, id)
  })
}
export const attachSurvey = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  callId: number,
  body: unknown
) => {
  const input = attachInput.parse(body)
  return attachCallForms(db, actor, callId, { forms: input.surveyId === null ? [] : [
    { surveyId: input.surveyId, revision: input.revision! }
  ] })
}

export const attachCallForms = async (
  db: Kysely<Database>, actor: GovernmentActor, callId: number, body: unknown
) => {
  const input = attachFormsInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const parent = await tx
      .selectFrom('funding_call as c')
      .innerJoin('stream as s', 's.id', 'c.streamId')
      .innerJoin('program as p', 'p.id', 's.programId')
      .select('p.agencyId')
      .where('c.id', '=', callId)
      .executeTakeFirst()
    if (!parent) return fail(404, 'CALL_NOT_FOUND')
    await requireGovernment(tx, actor, { agencyId: parent.agencyId, lock: true })
    const call = await tx
      .selectFrom('funding_call')
      .selectAll()
      .where('id', '=', callId)
      .forUpdate()
      .executeTakeFirstOrThrow()
    if (call.published) return fail(409, 'UNPUBLISH_BEFORE_EDITING')
    const submitted = await tx.selectFrom('submission_set as set')
      .innerJoin('set_response as response', 'response.setId', 'set.id')
      .select('response.id')
      .where('set.callId', '=', callId)
      .where('response.status', 'in', ['submitted', 'awaiting_documentation', 'withdrawn'])
      .executeTakeFirst()
    if (submitted) return fail(409, 'CALL_HAS_SUBMISSIONS')
    for (const form of input.forms) {
      const revision = await tx
        .selectFrom('survey_revision as r')
        .innerJoin('survey as s', 's.id', 'r.surveyId')
        .select('s.agencyId')
        .where('s.id', '=', form.surveyId)
        .where('r.revision', '=', form.revision)
        .executeTakeFirst()
      if (!revision || revision.agencyId !== parent.agencyId) return fail(404, 'SURVEY_NOT_FOUND')
    }
    await tx.deleteFrom('funding_call_form').where('callId', '=', callId).execute()
    if (input.forms.length) await tx.insertInto('funding_call_form').values(input.forms.map((form, position) => ({
      callId, position, surveyId: form.surveyId, surveyRevision: form.revision
    }))).execute()
    await tx
      .updateTable('funding_call')
      .set({
        surveyId: input.forms[0]?.surveyId ?? null,
        surveyRevision: input.forms[0]?.revision ?? null,
        revision: call.revision + 1
      })
      .where('id', '=', callId)
      .execute()
    return { success: true }
  })
}
/** Applicants receive only the exact revision pinned to a published call. */
export const applicantSurvey = async (
  db: GovernmentDb,
  organizationId: number,
  userId: number,
  callId: number
) => {
  const member = await db
    .selectFrom('membership')
    .select('userId')
    .where('organizationId', '=', organizationId)
    .where('userId', '=', userId)
    .executeTakeFirst()
  if (!member) return fail(404, 'ORGANIZATION_NOT_FOUND')
  if (!hasAccess(await getPermissions(db, organizationId, userId), 'application'))
    return fail(403, 'APPLICATION_PERMISSION_REQUIRED')
  const call = await db.selectFrom('funding_call').select(['id', 'nameEn', 'nameFr', 'surveyId', 'surveyRevision'])
    .where('id', '=', callId).where('published', '=', true).executeTakeFirst()
  if (!call) return fail(404, 'SURVEY_NOT_FOUND')
  let forms = await db.selectFrom('funding_call_form as form')
    .innerJoin('survey_revision as revision', join => join
      .onRef('form.surveyId', '=', 'revision.surveyId')
      .onRef('form.surveyRevision', '=', 'revision.revision'))
    .select(['revision.surveyId', 'revision.revision', 'revision.definition'])
    .where('form.callId', '=', callId).orderBy('form.position').execute()
  if (!forms.length && call.surveyId && call.surveyRevision) {
    const legacy = await db.selectFrom('survey_revision').select(['surveyId', 'revision', 'definition'])
      .where('surveyId', '=', call.surveyId).where('revision', '=', call.surveyRevision).executeTakeFirst()
    if (legacy) forms = [legacy]
  }
  if (!forms.length) return fail(404, 'SURVEY_NOT_FOUND')
  return { survey: { callId, nameEn: call.nameEn, nameFr: call.nameFr, ...forms[0] },
    forms: forms.map(form => ({ callId, nameEn: call.nameEn, nameFr: call.nameFr, ...form })) }
}
