import { sql, type Kysely, type Selectable } from 'kysely'
import { agreementInput, agreementUpdateInput } from '../../shared/schemas/agreements'
import type { AgreementStatus } from '../../shared/schemas/agreements'
import type { Database } from '../db/schema'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { lockOrganization, requireBusinessAccess } from './agreement-access'
import { hasAccess, subjects } from '../../shared/utils/permissions'
const map = (row: Selectable<Database['funding_agreement']>) => ({
  ...row,
  createdAt: new Date(row.createdAt).toISOString()
})
export const agreementRow = async (db: GovernmentDb, id: number) => {
  const row = await db
    .selectFrom('funding_agreement')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  if (!row) return fail(404, 'AGREEMENT_NOT_FOUND')
  return row
}
export const getAgreement = async (db: GovernmentDb, actor: GovernmentActor, id: number) => {
  const row = await agreementRow(db, id)
  await requireGovernment(db, actor, { agencyId: row.agencyId })
  return { agreement: map(row) }
}
export const listAgreements = async (
  db: GovernmentDb,
  actor: GovernmentActor,
  agencyId: number
) => {
  await requireGovernment(db, actor, { agencyId })
  return {
    agreements: (
      await db
        .selectFrom('funding_agreement')
        .selectAll()
        .where('agencyId', '=', agencyId)
        .orderBy('createdAt', 'desc')
        .execute()
    ).map(map)
  }
}
export const saveAgreement = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  body: unknown,
  id?: number
) => {
  const update = id ? agreementUpdateInput.parse(body) : null
  const input = update?.value ?? agreementInput.parse(body)
  const statusValue =
    input.status === undefined
      ? {}
      : {
          status:
            input.status === null
              ? null
              : sql<AgreementStatus>`${JSON.stringify(input.status)}::jsonb`
        }
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
          .selectFrom('funding_agreement')
          .select('id')
          .where('agencyId', '=', parent.agencyId)
          .where('sourceSystem', '=', input.config.sourceSystem)
          .where('foreignSystemId', '=', input.config.foreignSystemId)
          .executeTakeFirst()
      : null
    if (duplicate && duplicate.id !== id) return fail(409, 'EXTERNAL_AGREEMENT_EXISTS')
    if (id) {
      const previous = await tx
        .selectFrom('funding_agreement')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst()
      if (!previous || previous.agencyId !== parent.agencyId)
        return fail(404, 'AGREEMENT_NOT_FOUND')
      if (previous.organizationId !== input.organizationId || previous.streamId !== input.streamId)
        return fail(409, 'AGREEMENT_SCOPE_IMMUTABLE')
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
        .updateTable('funding_agreement')
        .set({
          ...input,
          ...statusValue,
          config: sql`${JSON.stringify(input.config)}::jsonb`,
          sourceSystem: input.config.sourceSystem,
          foreignSystemId: input.config.foreignSystemId,
          revision: previous.revision + 1
        })
        .where('id', '=', id)
        .execute()
    } else {
      const created = await tx
        .insertInto('funding_agreement')
        .values({
          ...input,
          ...statusValue,
          agencyId: parent.agencyId,
          config: sql`${JSON.stringify(input.config)}::jsonb`,
          sourceSystem: input.config.sourceSystem,
          foreignSystemId: input.config.foreignSystemId,
          revision: 1,
          createdAt: now
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      id = created.id
    }
    return getAgreement(tx, actor, id)
  })
}
export const organizationAgreements = async (
  db: GovernmentDb,
  organizationId: number,
  userId: number
) => {
  const permissions = await requireBusinessAccess(db, organizationId, userId, [], 'viewer')
  if (!subjects.some((subject) => subject !== 'application' && hasAccess(permissions, subject)))
    return fail(403, 'BUSINESS_PERMISSION_REQUIRED')
  return {
    agreements: await db
      .selectFrom('funding_agreement')
      .innerJoin('agency', 'agency.id', 'funding_agreement.agencyId')
      .select([
        'funding_agreement.id',
        'funding_agreement.nameEn',
        'funding_agreement.nameFr',
        'funding_agreement.agreementNumber',
        'funding_agreement.streamId',
        'funding_agreement.active',
        'funding_agreement.status',
        'agency.nameEn as agencyNameEn',
        'agency.nameFr as agencyNameFr'
      ])
      .where('funding_agreement.organizationId', '=', organizationId)
      .orderBy('funding_agreement.createdAt', 'desc')
      .execute()
  }
}

export const updateBalances = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  id: number,
  body: unknown
) => {
  const { balancesInput } = await import('../../shared/schemas/agreements')
  const input = balancesInput.parse(body),
    parent = await agreementRow(db, id)
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: parent.agencyId, lock: true })
    await lockOrganization(tx, parent.organizationId)
    const current = await tx
      .selectFrom('funding_agreement')
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
      .updateTable('funding_agreement')
      .set({
        config: sql`${JSON.stringify(current.config)}::jsonb`,
        revision: current.revision + 1
      })
      .where('id', '=', id)
      .execute()
    return getAgreement(tx, actor, id)
  })
}
