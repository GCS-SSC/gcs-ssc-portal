import { createError, defineEventHandler, getHeader, getRequestURL, setHeader } from 'h3'
import { ZodError, z } from 'zod'
import { useAuth } from '../../utils/auth'
import { useDatabase } from '../../utils/database'
import { portalConfig } from '../../utils/config'
import { parseJsonBody, readBoundedBody, toBoundedRequest } from '../../utils/request-body'
import {
  governmentFail as fail,
  requireGovernment,
  secretHash,
  type GovernmentActor
} from '../../utils/government-access'
import * as surveys from '../../utils/surveys'
import * as admin from '../../utils/government-admin'
import * as structure from '../../utils/government-structure'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  const method = event.method,
    authorization = getHeader(event, 'authorization')
  let path: string[]
  try {
    path = getRequestURL(event)
      .pathname.replace(/^\/api\/government\//, '')
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
  } catch {
    return fail(400, 'INVALID_INPUT')
  }
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  if (
    mutation &&
    (!authorization || getHeader(event, 'origin')) &&
    (getHeader(event, 'origin') !== portalConfig().appUrl ||
      getHeader(event, 'sec-fetch-site') === 'cross-site')
  )
    fail(403, 'ORIGIN_FORBIDDEN')
  const request = toBoundedRequest(event)
  const body = mutation
    ? await readBoundedBody(request, path[0] === 'surveys' ? 256 * 1024 : undefined)
    : undefined
  const db = await useDatabase()
  try {
    if (path[0] === 'invitations' && path.length === 2 && method === 'GET')
      return await admin.previewStaffInvitation(db, path[1]!)
    let actor: GovernmentActor
    if (authorization) {
      if (!/^Bearer gcs_[A-Za-z0-9_-]{43}$/.test(authorization))
        return fail(401, 'INVALID_INTEGRATION_TOKEN')
      actor = { kind: 'integration', tokenHash: secretHash(authorization.slice(7)) }
    } else {
      const session = await (await useAuth()).api.getSession({ headers: request.headers })
      if (!session) return fail(401, 'AUTHENTICATION_REQUIRED')
      if (
        path[0] === 'invitations' &&
        path.length === 3 &&
        path[2] === 'accept' &&
        method === 'POST'
      )
        return await admin.acceptStaffInvitation(db, path[1]!, session.user)
      actor = { kind: 'user', userId: session.user.id }
    }
    await requireGovernment(db, actor)
    const id = path[1]
      ? (path[0] === 'staff' ? z.string().min(1).max(128) : z.uuid()).parse(path[1])
      : undefined
    if (path.length === 1) {
      if (method === 'GET') {
        if (path[0] === 'agencies') return await structure.listAgencies(db, actor)
        if (path[0] === 'staff') return await admin.listStaff(db, actor)
        if (path[0] === 'staff-invitations') return await admin.listStaffInvitations(db, actor)
        if (path[0] === 'integration-tokens') return await admin.listTokens(db, actor)
      }
      if (method === 'POST') {
        const input = parseJsonBody(body)
        if (path[0] === 'surveys') return await surveys.createSurvey(db, actor, input)
        if (path[0] === 'agencies') return await structure.createAgency(db, actor, input)
        if (path[0] === 'programs') return await structure.createProgram(db, actor, input)
        if (path[0] === 'streams') return await structure.createStream(db, actor, input)
        if (path[0] === 'calls') return await structure.saveCall(db, actor, input)
        if (path[0] === 'staff-invitations') return await admin.inviteStaff(db, actor, input)
        if (path[0] === 'integration-tokens') return await admin.createToken(db, actor, input)
      }
    }
    if (id && path.length === 2) {
      if (path[0] === 'surveys' && method === 'GET') return await surveys.getSurvey(db, actor, id)
      if (path[0] === 'surveys' && method === 'PUT')
        return await surveys.updateSurvey(db, actor, id, parseJsonBody(body))
      if (path[0] === 'agencies' && method === 'GET')
        return await structure.agencyStructure(db, actor, id)
      if (method === 'PATCH') {
        const input = parseJsonBody(body)
        if (path[0] === 'agencies') return await structure.updateAgency(db, actor, id, input)
        if (path[0] === 'programs')
          return await structure.updateStructureName(db, actor, 'program', id, input)
        if (path[0] === 'streams')
          return await structure.updateStructureName(db, actor, 'stream', id, input)
      }
      if (path[0] === 'calls' && method === 'PUT')
        return await structure.saveCall(db, actor, parseJsonBody(body), id)
      if (path[0] === 'staff-invitations' && method === 'DELETE')
        return await admin.revokeStaffInvitation(db, actor, id)
      if (path[0] === 'integration-tokens' && method === 'DELETE')
        return await admin.revokeToken(db, actor, id)
    }
    if (
      id &&
      path.length === 3 &&
      path[0] === 'agencies' &&
      path[2] === 'surveys' &&
      method === 'GET'
    )
      return await surveys.listSurveys(db, actor, id)
    if (id && path.length === 3 && path[0] === 'calls' && path[2] === 'survey' && method === 'PUT')
      return await surveys.attachSurvey(db, actor, id, parseJsonBody(body))
    if (id && path.length === 3 && method === 'PATCH') {
      if (path[0] === 'calls' && path[2] === 'publication')
        return await structure.publishCall(db, actor, id, parseJsonBody(body))
      if (path[0] === 'staff' && (path[2] === 'access' || path[2] === 'status'))
        return await admin.changeStaff(db, actor, id, parseJsonBody(body), path[2])
    }
    return fail(404, 'NOT_FOUND')
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
