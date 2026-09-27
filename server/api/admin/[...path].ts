import { createError, defineEventHandler, getHeader, getQuery, getRequestURL, setHeader } from 'h3'
import { z, ZodError } from 'zod'
import { useDatabase } from '../../utils/database'
import { isPortalOriginAllowed } from '../../utils/config'
import { parseJsonBody, readBoundedBody, toBoundedRequest } from '../../utils/request-body'
import {
  administratorSession,
  requireAdministrator,
  signInAdministrator,
  signOutAdministrator
} from '../../utils/administrator-auth'
import { listEvidence, setEvidenceActor } from '../../utils/evidence'
import * as admin from '../../utils/government-admin'
import * as structure from '../../utils/government-structure'
import {
  decodePublicId,
  encodePublicId,
  publicReferences,
  resolvePublicInput
} from '../../utils/public-identifiers'

const credentials = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
  .strict()

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  const method = event.method
  const path = getRequestURL(event)
    .pathname.replace(/^\/api\/admin\//, '')
    .split('/')
    .filter(Boolean)
  if (
    !['GET', 'HEAD'].includes(method) &&
    (!isPortalOriginAllowed(getHeader(event, 'origin') ?? null, getRequestURL(event).href) ||
      getHeader(event, 'sec-fetch-site') === 'cross-site')
  )
    throw createError({
      statusCode: 403,
      message: 'ORIGIN_FORBIDDEN',
      data: { code: 'ORIGIN_FORBIDDEN' }
    })
  const db = await useDatabase()
  try {
    if (path[0] === 'session' && path.length === 1 && method === 'GET')
      return publicReferences({ administrator: await administratorSession(db, event) })
    if (path[0] === 'login' && path.length === 1 && method === 'POST')
      return publicReferences({
        administrator: await signInAdministrator(
          db,
          event,
          credentials.parse(parseJsonBody(await readBoundedBody(toBoundedRequest(event))))
        )
      })
    if (path[0] === 'logout' && path.length === 1 && method === 'POST') {
      await signOutAdministrator(db, event)
      return { success: true }
    }
    const administrator = await requireAdministrator(db, event)
    setEvidenceActor(event, { kind: 'administrator', id: administrator.id })
    const actor = { kind: 'administrator' as const, administratorId: administrator.id }
    if (
      path.length === 1 &&
      ['audit-events', 'access-events'].includes(path[0]!) &&
      method === 'GET'
    ) {
      const query = z
        .object({
          page: z.coerce.number().int().min(1).max(100000).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(25)
        })
        .parse(getQuery(event))
      return listEvidence(
        db,
        path[0] === 'audit-events' ? 'audit' : 'access',
        query.page,
        query.limit
      )
    }
    if (path.length === 1 && path[0] === 'agencies') {
      if (method === 'GET') return publicReferences(await structure.listAgencies(db, actor))
      if (method === 'POST')
        return publicReferences(
          await structure.createAgency(
            db,
            actor,
            parseJsonBody(await readBoundedBody(toBoundedRequest(event)))
          )
        )
    }
    if (path.length === 2 && path[0] === 'agencies' && method === 'PATCH')
      return publicReferences(
        await structure.updateAgency(
          db,
          actor,
          decodePublicId(path[1]!, 'agency'),
          parseJsonBody(await readBoundedBody(toBoundedRequest(event)))
        )
      )
    if (path.length === 1 && path[0] === 'integration-tokens') {
      if (method === 'GET')
        return (await admin.listTokens(db, actor)).map((token) => ({
          ...token,
          id: encodePublicId(token.id, 'token'),
          agencyId: encodePublicId(token.agencyId, 'agency')
        }))
      if (method === 'POST') {
        const result = await admin.createToken(
          db,
          actor,
          resolvePublicInput(parseJsonBody(await readBoundedBody(toBoundedRequest(event))))
        )
        return { ...result, id: encodePublicId(result.id, 'token') }
      }
    }
    if (path.length === 2 && path[0] === 'integration-tokens' && method === 'DELETE')
      return admin.revokeToken(db, actor, decodePublicId(path[1]!, 'token'))
    if (path.length === 3 && path[0] === 'integration-tokens' && path[2] === 'replace' && method === 'POST')
      return admin.replaceToken(db, actor, decodePublicId(path[1]!, 'token'))
    throw createError({ statusCode: 404, message: 'NOT_FOUND', data: { code: 'NOT_FOUND' } })
  } catch (error) {
    if (error instanceof ZodError)
      throw createError({
        statusCode: 400,
        message: 'INVALID_INPUT',
        data: { code: 'INVALID_INPUT', fields: error.issues.map((issue) => issue.path.join('.')) }
      })
    throw error
  }
})
