import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'

export interface EvidenceActor {
  kind: 'administrator' | 'organization' | 'integration'
  id: number
  agencyId?: number
}
export const setEvidenceActor = (event: H3Event, actor: EvidenceActor) => {
  if (event.context) event.context.evidenceActor = actor
}

const staticSegments = new Set([
  'api',
  'admin',
  'government',
  'auth',
  'session',
  'login',
  'logout',
  'agencies',
  'integration-tokens',
  'organizations',
  'invitations',
  'programs',
  'streams',
  'calls',
  'publication',
  'surveys',
  'agreements',
  'sets',
  'submissions',
  'attachments',
  'responses',
  'items',
  'members',
  'permissions',
  'accept',
  'audit-events',
  'access-events',
  'balance',
  'balances',
  'submit',
  'details',
  'exports',
  'status'
])
export const evidencePath = (pathname: string) =>
  pathname
    .split('/')
    .map((part) => (staticSegments.has(part) ? part : part ? ':id' : ''))
    .join('/')
    .slice(0, 240)

export const recordRequestEvidence = async (
  db: Kysely<Database>,
  input: { method: string; path: string; status: number; durationMs: number; actor?: EvidenceActor }
) => {
  const createdAt = new Date()
  const requestId = randomUUID()
  const identity = {
    actorKind: input.actor?.kind ?? 'anonymous',
    actorId: input.actor?.id ?? null,
    agencyId: input.actor?.agencyId ?? null,
    requestId
  }
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto('access_event')
      .values({
        id: randomUUID(),
        createdAt,
        method: input.method,
        path: evidencePath(input.path),
        status: input.status,
        durationMs: input.durationMs,
        ...identity
      })
      .execute()
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(input.method) &&
      input.status >= 200 &&
      input.status < 400
    )
      await tx
        .insertInto('audit_event')
        .values({
          id: randomUUID(),
          createdAt,
          operation: input.method,
          resource: evidencePath(input.path),
          path: evidencePath(input.path),
          ...identity
        })
        .execute()
  })
}

export const listEvidence = async (
  db: Kysely<Database>,
  kind: 'audit' | 'access',
  page: number,
  limit: number
) => {
  const table = kind === 'audit' ? 'audit_event' : 'access_event'
  const rows = await db
    .selectFrom(table)
    .selectAll()
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute()
  const count = await db
    .selectFrom(table)
    .select((eb) => eb.fn.countAll<number>().as('total'))
    .executeTakeFirstOrThrow()
  return { items: rows, total: Number(count.total), page, limit }
}
