import { createError } from 'h3'
import type { Kysely, Transaction } from 'kysely'
import type { Database } from '../db/schema'
import {
  primaryResponseCode,
  publicCode,
  publicNumber,
  responseNumber,
  type ResponseCategory
} from '../../shared/utils/response-code'

const prefixes = {
  user: 'U',
  organization: 'N',
  agency: 'G',
  program: 'P',
  stream: 'T',
  call: 'D',
  survey: 'V',
  agreement: 'A',
  set: 'S',
  attachment: 'X',
  detail: 'H',
  invitation: 'J',
  token: 'Q',
  administrator: 'M'
} as const

export type PublicIdKind = keyof typeof prefixes | 'response'

export const encodePublicId = (id: number, kind: Exclude<PublicIdKind, 'response'>) =>
  publicCode(id, prefixes[kind])

export const decodePublicId = (code: string, kind: PublicIdKind): number => {
  const id = kind === 'response' ? responseNumber(code) : publicNumber(code, prefixes[kind])
  if (id === null) throw createError({ statusCode: 404, message: 'NOT_FOUND' })
  return id
}

export const resolveResponseCode = async (
  db: Kysely<Database> | Transaction<Database>,
  code: string
): Promise<number> => {
  const id = decodePublicId(code, 'response')
  const row = await db
    .selectFrom('set_response')
    .select(['snapshot'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (
    !row ||
    primaryResponseCode(
      id,
      row.snapshot.items.map((entry) => entry.item.kind)
    ) !== code
  )
    throw createError({ statusCode: 404, message: 'NOT_FOUND' })
  return id
}

export const resolvePublicInput = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(resolvePublicInput)
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    return value
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    const kind = key.endsWith('Id') ? (key.slice(0, -2) as PublicIdKind) : null
    if (kind && kind in prefixes) {
      if (entry === null) result[key] = null
      else if (typeof entry === 'string') result[key] = decodePublicId(entry, kind)
      else throw createError({ statusCode: 400, message: 'INVALID_INPUT' })
    } else if (key === 'attachmentIds' && Array.isArray(entry)) {
      result[key] = entry.map((code) => {
        if (typeof code !== 'string') throw createError({ statusCode: 400, message: 'INVALID_INPUT' })
        return decodePublicId(code, 'attachment')
      })
    } else result[key] = resolvePublicInput(entry)
  }
  return result
}

const fieldKind = (key: string): PublicIdKind | null => {
  if (key === 'ownerId' || key === 'createdBy' || key === 'updatedBy' || key === 'submittedBy')
    return 'user'
  const stem = key.endsWith('Id') ? key.slice(0, -2) : ''
  if (stem === 'response' || stem === 'submission') return 'response'
  return stem in prefixes ? (stem as keyof typeof prefixes) : null
}

const objectKind = (key: string): PublicIdKind | null => {
  if (key.endsWith('Reference')) return objectKind(key.slice(0, -9))
  const singular = key.endsWith('ies')
    ? `${key.slice(0, -3)}y`
    : key.endsWith('s')
      ? key.slice(0, -1)
      : key
  if (singular === 'submission') return 'response'
  if (singular === 'response') return 'response'
  return singular in prefixes ? (singular as keyof typeof prefixes) : null
}

const responseId = (id: number, item: Record<string, unknown>): string => {
  if (typeof item.submissionId === 'string') return item.submissionId
  const codes = item.codes as Partial<Record<ResponseCategory, string>> | undefined
  const known = codes?.claim ?? codes?.forecast ?? codes?.other
  if (known) return known
  const snapshot = item.snapshot as
    { items?: Array<{ item?: { kind?: 'claim' | 'forecast' | 'survey' } }> } | undefined
  return primaryResponseCode(
    id,
    snapshot?.items?.map((entry) => entry.item?.kind ?? 'survey') ?? []
  )
}

/** Encode application-owned numeric identifiers after service authorization, before JSON transport. */
export const publicReferences = <T>(value: T): T => {
  const visit = (item: unknown, context: PublicIdKind | null): unknown => {
    if (Array.isArray(item)) return item.map((entry) => visit(entry, context))
    if (!item || typeof item !== 'object' || Object.getPrototypeOf(item) !== Object.prototype)
      return item
    const source = item as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(source)) {
      if (key === 'attachmentIds' && Array.isArray(entry)) {
        result[key] = entry.map((id) =>
          typeof id === 'number' ? encodePublicId(id, 'attachment') : id
        )
        continue
      }
      if (typeof entry === 'number' && Number.isSafeInteger(entry)) {
        const kind = key === 'id' ? context : fieldKind(key)
        result[key] =
          kind === 'response'
            ? responseId(entry, source)
            : kind
              ? encodePublicId(entry, kind)
              : entry
      } else result[key] = visit(entry, objectKind(key))
    }
    return result
  }
  return visit(value, null) as T
}
