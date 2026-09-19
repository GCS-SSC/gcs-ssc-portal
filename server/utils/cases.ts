import { sql, type Kysely, type Selectable } from 'kysely'
import { v7 as uuid } from 'uuid'
import { caseInput, caseUpdateInput } from '../../shared/schemas/cases'
import type { Database } from '../db/schema'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { lockOrganization, requireBusinessAccess } from './case-access'
import { hasAccess, subjects } from '../../shared/utils/permissions'
const map = (row: Selectable<Database['funding_case']>) => ({
  ...row,
  createdAt: new Date(row.createdAt).toISOString()
})
export const caseRow = async (db: GovernmentDb, id: string) => {
  const row = await db
    .selectFrom('funding_case')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  if (!row) return fail(404, 'CASE_NOT_FOUND')
  return row
}
export const getCase = async (db: GovernmentDb, actor: GovernmentActor, id: string) => {
  const row = await caseRow(db, id)
  await requireGovernment(db, actor, { agencyId: row.agencyId })
  return { case: map(row) }
}
export const listCases = async (db: GovernmentDb, actor: GovernmentActor, agencyId: string) => {
  await requireGovernment(db, actor, { agencyId })
  return {
    cases: (
      await db
        .selectFrom('funding_case')
        .selectAll()
        .where('agencyId', '=', agencyId)
        .orderBy('createdAt', 'desc')
        .execute()
    ).map(map)
  }
}
export const saveCase = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  body: unknown,
  id?: string
) => {
  const update = id ? caseUpdateInput.parse(body) : null
  const input = update?.value ?? caseInput.parse(body)
  const parent = await db
    .selectFrom('stream as s')
    .innerJoin('program as p', 'p.id', 's.programId')
    .select(['p.agencyId', 's.sourceSystem', 's.foreignSystemId'])
    .where('s.id', '=', input.streamId)
    .executeTakeFirst()
  if (!parent) return fail(404, 'STREAM_NOT_FOUND')
  if (parent.foreignSystemId && parent.sourceSystem === input.config.sourceSystem) {
    if (input.config.externalStreamId && input.config.externalStreamId !== parent.foreignSystemId)
      return fail(400, 'EXTERNAL_STREAM_MISMATCH')
    input.config.externalStreamId = parent.foreignSystemId
  }
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: parent.agencyId, lock: true })
    await lockOrganization(tx, input.organizationId)
    const now = new Date()
    const duplicate = input.config.foreignSystemId
      ? await tx
          .selectFrom('funding_case')
          .select('id')
          .where('agencyId', '=', parent.agencyId)
          .where('sourceSystem', '=', input.config.sourceSystem)
          .where('foreignSystemId', '=', input.config.foreignSystemId)
          .executeTakeFirst()
      : null
    if (duplicate && duplicate.id !== id) return fail(409, 'EXTERNAL_CASE_EXISTS')
    if (id) {
      const previous = await tx
        .selectFrom('funding_case')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst()
      if (!previous || previous.agencyId !== parent.agencyId) return fail(404, 'CASE_NOT_FOUND')
      if (previous.organizationId !== input.organizationId || previous.streamId !== input.streamId)
        return fail(409, 'CASE_SCOPE_IMMUTABLE')
      if (previous.revision !== update!.expectedRevision) return fail(409, 'REVISION_CONFLICT')
      const before = previous.config,
        after = input.config
      if (
        before.sourceSystem !== after.sourceSystem ||
        (before.foreignSystemId && before.foreignSystemId !== after.foreignSystemId) ||
        (before.externalStreamId && before.externalStreamId !== after.externalStreamId) ||
        (before.externalApplicantRecipientId &&
          before.externalApplicantRecipientId !== after.externalApplicantRecipientId)
      )
        return fail(409, 'EXTERNAL_IDENTITY_IMMUTABLE')
      for (const year of after.fiscalYears) {
        const old = before.fiscalYears.find((entry) => entry.id === year.id)
        if (
          old &&
          (old.startYear !== year.startYear ||
            (old.foreignSystemId && old.foreignSystemId !== year.foreignSystemId))
        )
          return fail(409, 'EXTERNAL_IDENTITY_IMMUTABLE')
      }
      for (const line of after.budgetLines) {
        const old = before.budgetLines.find((entry) => entry.id === line.id)
        if (!old) continue
        if (
          old.currency !== line.currency ||
          old.fiscalYearId !== line.fiscalYearId ||
          (old.foreignSystemId && old.foreignSystemId !== line.foreignSystemId)
        )
          return fail(409, 'EXTERNAL_IDENTITY_IMMUTABLE')
        if (
          old.balanceAsOf &&
          (!line.balanceAsOf || new Date(line.balanceAsOf) < new Date(old.balanceAsOf))
        )
          return fail(409, 'BALANCE_TIMESTAMP_CONFLICT')
        if (
          old.balanceAsOf &&
          line.balanceAsOf &&
          new Date(line.balanceAsOf).getTime() === new Date(old.balanceAsOf).getTime() &&
          ['budgetedAmount', 'balance', 'claimedAmount', 'forecastAmount'].some(
            (key) => old[key as keyof typeof old] !== line[key as keyof typeof line]
          )
        )
          return fail(409, 'BALANCE_TIMESTAMP_CONFLICT')
      }
      await tx
        .updateTable('funding_case')
        .set({
          ...input,
          config: sql`${JSON.stringify(input.config)}::jsonb`,
          sourceSystem: input.config.sourceSystem,
          foreignSystemId: input.config.foreignSystemId,
          revision: previous.revision + 1
        })
        .where('id', '=', id)
        .execute()
    } else {
      id = uuid()
      await tx
        .insertInto('funding_case')
        .values({
          ...input,
          id,
          agencyId: parent.agencyId,
          config: sql`${JSON.stringify(input.config)}::jsonb`,
          sourceSystem: input.config.sourceSystem,
          foreignSystemId: input.config.foreignSystemId,
          revision: 1,
          createdAt: now
        })
        .execute()
    }
    return getCase(tx, actor, id)
  })
}
export const organizationCases = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string
) => {
  const permissions = await requireBusinessAccess(db, organizationId, userId, [], 'viewer')
  if (!subjects.some((subject) => subject !== 'application' && hasAccess(permissions, subject)))
    return fail(403, 'BUSINESS_PERMISSION_REQUIRED')
  return {
    cases: await db
      .selectFrom('funding_case')
      .select(['id', 'nameEn', 'nameFr', 'agreementNumber', 'streamId'])
      .where('organizationId', '=', organizationId)
      .orderBy('createdAt', 'desc')
      .execute()
  }
}

export const updateBalances = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  id: string,
  body: unknown
) => {
  const { balancesInput } = await import('../../shared/schemas/cases')
  const input = balancesInput.parse(body),
    parent = await caseRow(db, id)
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: parent.agencyId, lock: true })
    await lockOrganization(tx, parent.organizationId)
    const current = await tx
      .selectFrom('funding_case')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirstOrThrow()
    if (current.revision !== input.expectedRevision) return fail(409, 'REVISION_CONFLICT')
    for (const update of input.lines) {
      const line = current.config.budgetLines.find(
        (item) => item.foreignSystemId === update.foreignSystemId
      )
      if (!line) return fail(400, 'UNKNOWN_BUDGET_LINE')
      if (line.balanceAsOf && new Date(input.asOf) <= new Date(line.balanceAsOf))
        return fail(409, 'BALANCE_TIMESTAMP_CONFLICT')
      Object.assign(line, update, { balanceAsOf: input.asOf })
    }
    await tx
      .updateTable('funding_case')
      .set({
        config: sql`${JSON.stringify(current.config)}::jsonb`,
        revision: current.revision + 1
      })
      .where('id', '=', id)
      .execute()
    return getCase(tx, actor, id)
  })
}
