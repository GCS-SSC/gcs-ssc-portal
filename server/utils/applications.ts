import { sql, type Kysely } from 'kysely'
import { v7 as uuid } from 'uuid'
import type { Database } from '../db/schema'
import { startResponseInput, type SetItem, type SetSnapshot } from '../../shared/schemas/agreements'
import { governmentFail as fail } from './government-access'
import { lockOrganization, requireBusinessAccess } from './agreement-access'
import { requireOpenCall, calendarText } from './response-publication'
import { createResponseDraft } from './response-records'
import { getResponse } from './set-responses'
export const startApplication = async (
  db: Kysely<Database>,
  organizationId: string,
  userId: string,
  callId: string,
  body: unknown
) => {
  const input = startResponseInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await lockOrganization(tx, organizationId)
    await requireBusinessAccess(tx, organizationId, userId, ['application'], 'contributor')
    const call = await tx
      .selectFrom('funding_call')
      .selectAll()
      .where('id', '=', callId)
      .forUpdate()
      .executeTakeFirst()
    if (!call || !call.published || !call.surveyId || !call.surveyRevision)
      return fail(404, 'SURVEY_NOT_FOUND')
    requireOpenCall(call)
    let set = await tx
      .selectFrom('submission_set')
      .selectAll()
      .where('organizationId', '=', organizationId)
      .where('callId', '=', callId)
      .executeTakeFirst()
    // Never silently replace an organization's shared draft after the call changes.
    if (set) {
      const draft = await tx
        .selectFrom('set_response')
        .select('id')
        .where('setId', '=', set.id)
        .where('status', '=', 'draft')
        .executeTakeFirst()
      if (draft) return getResponse(tx, organizationId, userId, draft.id)
    }
    if (!set || set.snapshot?.application?.callRevision !== call.revision) {
      const stream = await tx
        .selectFrom('stream')
        .selectAll()
        .where('id', '=', call.streamId)
        .executeTakeFirstOrThrow()
      const survey = await tx
        .selectFrom('survey_revision')
        .select('definition')
        .where('surveyId', '=', call.surveyId)
        .where('revision', '=', call.surveyRevision)
        .executeTakeFirstOrThrow()
      const item = {
        id: 'application',
        kind: 'survey' as const,
        surveyId: call.surveyId,
        surveyRevision: call.surveyRevision
      }
      const snapshot: SetSnapshot = {
        schemaVersion: 1,
        publicationId: uuid(),
        nameEn: call.nameEn,
        nameFr: call.nameFr,
        sourceSystem: call.sourceSystem,
        foreignSystemId: call.foreignSystemId,
        agreement: null,
        agreementReference: null,
        items: [{ item, survey: survey.definition }],
        application: {
          callId,
          callRevision: call.revision,
          agencyId: call.agencyId,
          programId: stream.programId,
          streamId: stream.id,
          startDate: calendarText(call.startDate),
          endDate: calendarText(call.endDate),
          sourceSystem: call.sourceSystem,
          foreignSystemId: call.foreignSystemId,
          externalStreamId:
            stream.sourceSystem === call.sourceSystem ? stream.foreignSystemId : null
        }
      }
      const values = {
        nameEn: call.nameEn,
        nameFr: call.nameFr,
        items: sql<SetItem[]>`${JSON.stringify([item])}::jsonb`,
        snapshot: sql<SetSnapshot>`${JSON.stringify(snapshot)}::jsonb`,
        published: true
      }
      if (set)
        set = await tx
          .updateTable('submission_set')
          .set({ ...values, revision: set.revision + 1 })
          .where('id', '=', set.id)
          .returningAll()
          .executeTakeFirstOrThrow()
      else
        set = await tx
          .insertInto('submission_set')
          .values({
            ...values,
            id: uuid(),
            organizationId,
            agencyId: call.agencyId,
            agreementId: null,
            callId,
            sourceSystem: call.sourceSystem,
            foreignSystemId: null,
            revision: 1,
            createdAt: new Date()
          })
          .returningAll()
          .executeTakeFirstOrThrow()
    }
    const responseId = await createResponseDraft(tx, set, userId, input.locale)
    return getResponse(tx, organizationId, userId, responseId)
  })
}
