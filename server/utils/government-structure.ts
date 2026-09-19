import { sql, type Kysely } from 'kysely'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '../db/schema'
import {
  bilingualName,
  programInput,
  streamInput,
  callInput,
  publishInput
} from '../../shared/schemas/government'
import {
  governmentFail as fail,
  requireGovernment,
  type GovernmentActor,
  type GovernmentDb
} from './government-access'
import { getPermissions } from './portal'

const iso = (date: Date) => new Date(date).toISOString()
const dateText = (value: string | Date) =>
  typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
const programOwner = async (db: GovernmentDb, id: string) =>
  (await db.selectFrom('program').selectAll().where('id', '=', id).executeTakeFirst()) ??
  fail(404, 'PROGRAM_NOT_FOUND')
const streamOwner = async (db: GovernmentDb, id: string) =>
  (await db
    .selectFrom('stream')
    .innerJoin('program', 'program.id', 'stream.programId')
    .select(['stream.id', 'stream.programId', 'program.agencyId'])
    .where('stream.id', '=', id)
    .executeTakeFirst()) ?? fail(404, 'STREAM_NOT_FOUND')
const callQuery = (db: GovernmentDb) =>
  db
    .selectFrom('funding_call as c')
    .innerJoin('stream as s', 's.id', 'c.streamId')
    .innerJoin('program as p', 'p.id', 's.programId')
    .innerJoin('agency as a', 'a.id', 'p.agencyId')
    .select([
      'c.id',
      'c.nameEn',
      'c.nameFr',
      'c.streamId',
      sql<string>`to_char(c."startDate", 'YYYY-MM-DD')`.as('startDate'),
      sql<string>`to_char(c."endDate", 'YYYY-MM-DD')`.as('endDate'),
      'c.published',
      'c.surveyId',
      'c.surveyRevision',
      'c.createdAt',
      'p.id as programId',
      'a.id as agencyId',
      'a.nameEn as agencyNameEn',
      'a.nameFr as agencyNameFr',
      'p.nameEn as programNameEn',
      'p.nameFr as programNameFr',
      's.nameEn as streamNameEn',
      's.nameFr as streamNameFr'
    ])
export const listAgencies = async (db: GovernmentDb, actor: GovernmentActor) => {
  const access = await requireGovernment(db, actor)
  let query = db.selectFrom('agency').selectAll().orderBy('nameEn')
  if (access.role !== 'root') {
    if (!access.agencyIds.length) return { agencies: [] }
    query = query.where('id', 'in', access.agencyIds)
  }
  return {
    agencies: (await query.execute()).map((row) => ({ ...row, createdAt: iso(row.createdAt) }))
  }
}
export const createAgency = async (db: Kysely<Database>, actor: GovernmentActor, body: unknown) => {
  const input = bilingualName.parse(body)
  return db.transaction().execute(async (tx) => {
    const access = await requireGovernment(tx, actor, { lock: true })
    if (actor.kind !== 'user' || access.role === 'integration')
      return fail(403, 'GOVERNMENT_USER_REQUIRED')
    const agency = { id: uuidv7(), ...input, createdAt: new Date() }
    await tx.insertInto('agency').values(agency).execute()
    await tx
      .insertInto('agency_staff')
      .values({ agencyId: agency.id, userId: actor.userId })
      .execute()
    return { agency: { ...agency, createdAt: iso(agency.createdAt) } }
  })
}
export const updateAgency = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  id: string,
  body: unknown
) => {
  const input = bilingualName.parse(body)
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId: id, lock: true })
    const row = await tx
      .updateTable('agency')
      .set(input)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()
    if (!row) return fail(404, 'AGENCY_NOT_FOUND')
    return { agency: { ...row, createdAt: iso(row.createdAt) } }
  })
}
export const agencyStructure = async (db: GovernmentDb, actor: GovernmentActor, id: string) => {
  await requireGovernment(db, actor, { agencyId: id })
  const agency = await db.selectFrom('agency').selectAll().where('id', '=', id).executeTakeFirst()
  if (!agency) return fail(404, 'AGENCY_NOT_FOUND')
  const programs = await db
    .selectFrom('program')
    .selectAll()
    .where('agencyId', '=', id)
    .orderBy('createdAt')
    .execute()
  const streams = await db
    .selectFrom('stream')
    .innerJoin('program', 'program.id', 'stream.programId')
    .selectAll('stream')
    .select('program.agencyId')
    .where('program.agencyId', '=', id)
    .orderBy('stream.createdAt')
    .execute()
  const calls = await callQuery(db).where('a.id', '=', id).orderBy('c.createdAt', 'desc').execute()
  return {
    agency: { ...agency, createdAt: iso(agency.createdAt) },
    programs: programs.map((row) => ({ ...row, createdAt: iso(row.createdAt) })),
    streams: streams.map((row) => ({ ...row, createdAt: iso(row.createdAt) })),
    calls: calls.map((row) => ({
      ...row,
      startDate: dateText(row.startDate),
      endDate: dateText(row.endDate),
      createdAt: iso(row.createdAt)
    }))
  }
}
export const createProgram = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  body: unknown
) => {
  const input = programInput.parse(body)
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
    const row = { id: uuidv7(), ...input, createdAt: new Date() }
    await tx.insertInto('program').values(row).execute()
    return { program: { ...row, createdAt: iso(row.createdAt) } }
  })
}
export const createStream = async (db: Kysely<Database>, actor: GovernmentActor, body: unknown) => {
  const input = streamInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const program = await programOwner(tx, input.programId)
    await requireGovernment(tx, actor, { agencyId: program.agencyId, lock: true })
    const row = { id: uuidv7(), ...input, createdAt: new Date() }
    await tx.insertInto('stream').values(row).execute()
    return { stream: { ...row, agencyId: program.agencyId, createdAt: iso(row.createdAt) } }
  })
}
export const updateStructureName = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  kind: 'program' | 'stream',
  id: string,
  body: unknown
) => {
  const input = bilingualName.parse(body)
  return db.transaction().execute(async (tx) => {
    const parent = kind === 'program' ? await programOwner(tx, id) : await streamOwner(tx, id)
    await requireGovernment(tx, actor, { agencyId: parent.agencyId, lock: true })
    await tx.updateTable(kind).set(input).where('id', '=', id).execute()
    return { success: true }
  })
}
export const saveCall = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  body: unknown,
  id?: string
) => {
  const input = callInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const stream = await streamOwner(tx, input.streamId)
    await requireGovernment(tx, actor, { agencyId: stream.agencyId, lock: true })
    if (id) {
      const previous = await tx
        .selectFrom('funding_call')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst()
      if (!previous) return fail(404, 'CALL_NOT_FOUND')
      const originalStream = await streamOwner(tx, previous.streamId)
      await requireGovernment(tx, actor, { agencyId: originalStream.agencyId })
      // Parent links are immutable: API callers cannot move a call between agency hierarchies.
      if (previous.streamId !== input.streamId) return fail(409, 'CALL_STREAM_IMMUTABLE')
      if (previous.published) return fail(409, 'UNPUBLISH_BEFORE_EDITING')
      await tx.updateTable('funding_call').set(input).where('id', '=', id).execute()
    } else {
      id = uuidv7()
      await tx
        .insertInto('funding_call')
        .values({ id, ...input, published: false, createdAt: new Date() })
        .execute()
    }
    return { id }
  })
}
export const publishCall = async (
  db: Kysely<Database>,
  actor: GovernmentActor,
  id: string,
  body: unknown
) => {
  const input = publishInput.parse(body)
  return db.transaction().execute(async (tx) => {
    const call = await callQuery(tx).where('c.id', '=', id).executeTakeFirst()
    if (!call) return fail(404, 'CALL_NOT_FOUND')
    await requireGovernment(tx, actor, { agencyId: call.agencyId, lock: true })
    await tx
      .updateTable('funding_call')
      .set({ published: input.published })
      .where('id', '=', id)
      .execute()
    return { success: true }
  })
}
export const fundingCatalogue = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string
) => {
  const membership = await db
    .selectFrom('membership')
    .select('userId')
    .where('organizationId', '=', organizationId)
    .where('userId', '=', userId)
    .executeTakeFirst()
  if (!membership) return fail(404, 'ORGANIZATION_NOT_FOUND')
  if (!(await getPermissions(db, organizationId, userId)).includes('application'))
    return fail(403, 'APPLICATION_PERMISSION_REQUIRED')
  const calls = await callQuery(db)
    .where('c.published', '=', true)
    .orderBy('c.startDate', 'desc')
    .execute()
  return {
    calls: calls.map((row) => ({
      ...row,
      startDate: dateText(row.startDate),
      endDate: dateText(row.endDate),
      createdAt: iso(row.createdAt)
    }))
  }
}
