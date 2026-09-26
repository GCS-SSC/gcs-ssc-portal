import type { SetSnapshot } from '../../shared/schemas/agreements'
import { governmentFail as fail, type GovernmentDb } from './government-access'
import { setRow } from './submission-sets'
export const calendarText = (value: Date | string) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10)
export const requireOpenCall = (call: {
  published: boolean
  startDate: Date | string
  startTime: string
  endDate: Date | string
  endTime: string
}) => {
  if (!call.published) return fail(409, 'SET_WITHDRAWN')
  const now = Date.now()
  const start = Date.parse(`${calendarText(call.startDate)}T${call.startTime}Z`)
  const end = Date.parse(`${calendarText(call.endDate)}T${call.endTime}Z`)
  if (now < start || now > end) return fail(409, 'CALL_NOT_OPEN')
}
/** Called inside an organization-locked transaction; call row serializes publication/deadline changes. */
export const requireResponsePublication = async (
  db: GovernmentDb,
  setId: number,
  snapshot: SetSnapshot
) => {
  const set = await setRow(db, setId)
  if (!set.published || set.snapshot?.publicationId !== snapshot.publicationId)
    return fail(409, 'SET_WITHDRAWN')
  if (set.callId) {
    if (set.callId !== snapshot.application?.callId) return fail(409, 'SET_WITHDRAWN')
    const call = await db
      .selectFrom('funding_call')
      .selectAll()
      .where('id', '=', set.callId)
      .forUpdate()
      .executeTakeFirstOrThrow()
    if (call.revision !== snapshot.application.callRevision) return fail(409, 'SET_WITHDRAWN')
    requireOpenCall(call)
  }
}
