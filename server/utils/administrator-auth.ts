import { randomBytes, createHash } from 'node:crypto'
import { verifyPassword } from 'better-auth/crypto'
import { getCookie, setCookie, deleteCookie, createError } from 'h3'
import type { H3Event } from 'h3'
import { sql, type Kysely } from 'kysely'
import type { Database } from '../db/schema'
import { portalConfig } from './config'

const cookieName = 'portal_administrator'
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
const cookieOptions = () => ({
  httpOnly: true,
  secure: portalConfig().production,
  sameSite: 'strict' as const,
  path: '/api/admin',
  maxAge: 60 * 60 * 24 * 7
})

export const administratorSession = async (db: Kysely<Database>, event: H3Event) => {
  const token = getCookie(event, cookieName)
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const row = await db
    .selectFrom('administrator_session as s')
    .innerJoin('administrator as a', 'a.id', 's.administratorId')
    .select(['a.id', 'a.name', 'a.email', 'a.active', 's.expiresAt'])
    .where('s.tokenHash', '=', tokenHash(token))
    .executeTakeFirst()
  if (!row?.active || new Date(row.expiresAt).getTime() <= Date.now()) return null
  return { id: row.id, name: row.name, email: row.email }
}

export const requireAdministrator = async (db: Kysely<Database>, event: H3Event) => {
  const administrator = await administratorSession(db, event)
  if (!administrator)
    throw createError({
      statusCode: 401,
      message: 'ADMINISTRATOR_REQUIRED',
      data: { code: 'ADMINISTRATOR_REQUIRED' }
    })
  return administrator
}

export const signInAdministrator = async (
  db: Kysely<Database>,
  event: H3Event,
  input: { email: string; password: string }
) => {
  const key = tokenHash(
    `${event.node.req.socket?.remoteAddress ?? 'unknown'}:${input.email.toLowerCase()}`
  )
  const cutoff = new Date(Date.now() - 15 * 60_000)
  const attempts = await sql<{ count: number }>`
    INSERT INTO administrator_login_attempt (key, "windowStart", count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN administrator_login_attempt."windowStart" < ${cutoff}
        THEN 1 ELSE administrator_login_attempt.count + 1 END,
      "windowStart" = CASE WHEN administrator_login_attempt."windowStart" < ${cutoff}
        THEN now() ELSE administrator_login_attempt."windowStart" END
    RETURNING count
  `.execute(db)
  if (attempts.rows[0]!.count > 10)
    throw createError({
      statusCode: 429,
      message: 'TOO_MANY_ATTEMPTS',
      data: { code: 'TOO_MANY_ATTEMPTS' }
    })
  const row = await db
    .selectFrom('administrator')
    .selectAll()
    .where('email', '=', input.email.toLowerCase())
    .executeTakeFirst()
  if (!row?.active || !(await verifyPassword({ hash: row.passwordHash, password: input.password })))
    throw createError({
      statusCode: 401,
      message: 'INVALID_CREDENTIALS',
      data: { code: 'INVALID_CREDENTIALS' }
    })
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  await db
    .insertInto('administrator_session')
    .values({
      tokenHash: tokenHash(token),
      administratorId: row.id,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 86400000)
    })
    .execute()
  setCookie(event, cookieName, token, cookieOptions())
  return { id: row.id, name: row.name, email: row.email }
}

export const signOutAdministrator = async (db: Kysely<Database>, event: H3Event) => {
  const token = getCookie(event, cookieName)
  if (token)
    await db.deleteFrom('administrator_session').where('tokenHash', '=', tokenHash(token)).execute()
  deleteCookie(event, cookieName, cookieOptions())
}
