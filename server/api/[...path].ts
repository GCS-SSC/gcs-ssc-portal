import { applicantSurvey } from '../utils/surveys'
import { createError, defineEventHandler, getHeader, getRequestURL, setHeader } from 'h3'
import { ZodError } from 'zod'
import { organizationId } from '../../shared/schemas/portal'
import { useAuth } from '../utils/auth'
import { useDatabase } from '../utils/database'
import { portalConfig } from '../utils/config'
import { parseJsonBody, readBoundedBody, toBoundedRequest } from '../utils/request-body'
import * as portal from '../utils/portal'
import { governmentAccess } from '../utils/government-access'
import { fundingCatalogue } from '../utils/government-structure'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  const method = event.method
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (
      getHeader(event, 'origin') !== portalConfig().appUrl ||
      getHeader(event, 'sec-fetch-site') === 'cross-site'
    )
      throw createError({
        statusCode: 403,
        message: 'ORIGIN_FORBIDDEN',
        data: { code: 'ORIGIN_FORBIDDEN' }
      })
  }
  const request = toBoundedRequest(event)
  const body = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    ? await readBoundedBody(request)
    : undefined
  const path = getRequestURL(event)
    .pathname.replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean)
  const db = await useDatabase()
  try {
    if (path[0] === 'invitations' && path.length === 2 && method === 'GET')
      return await portal.previewInvitation(db, path[1]!)
    const session = await (await useAuth()).api.getSession({ headers: request.headers })
    const user = session
      ? { id: session.user.id, name: session.user.name, email: session.user.email }
      : null
    if (path[0] === 'session' && path.length === 1 && method === 'GET')
      return { user, government: user ? await governmentAccess(db, user.id) : null }
    if (!user)
      throw createError({
        statusCode: 401,
        message: 'AUTHENTICATION_REQUIRED',
        data: { code: 'AUTHENTICATION_REQUIRED' }
      })
    if (path[0] === 'invitations' && path.length === 3 && path[2] === 'accept' && method === 'POST')
      return await portal.acceptInvitation(db, path[1]!, user)
    if (path[0] === 'organizations') {
      if (path.length === 1) {
        if (method === 'GET') return await portal.listOrganizations(db, user.id)
        if (method === 'POST')
          return await portal.createOrganization(db, user.id, parseJsonBody(body))
      } else {
        const id = organizationId.parse(path[1])
        if (path.length === 2) {
          if (method === 'GET') return await portal.getOrganization(db, id, user.id)
          if (method === 'PATCH')
            return await portal.updateOrganization(db, id, user.id, parseJsonBody(body))
        }
        if (
          path.length === 5 &&
          path[2] === 'funding-calls' &&
          path[4] === 'survey' &&
          method === 'GET'
        )
          return await applicantSurvey(db, id, user.id, organizationId.parse(path[3]))
        if (path.length === 3 && path[2] === 'funding-calls' && method === 'GET')
          return await fundingCatalogue(db, id, user.id)
        if (path.length === 3 && path[2] === 'members' && method === 'GET')
          return await portal.listMembers(db, id, user.id)
        if (path.length === 4 && path[2] === 'members' && method === 'PATCH')
          return await portal.updatePermissions(db, id, user.id, path[3]!, parseJsonBody(body))
        if (path.length === 3 && path[2] === 'transfer' && method === 'POST')
          return await portal.transferOwnership(db, id, user.id, parseJsonBody(body))
        if (path.length === 3 && path[2] === 'invitations') {
          if (method === 'GET') return await portal.listInvitations(db, id, user.id)
          if (method === 'POST')
            return await portal.createInvitation(db, id, user.id, parseJsonBody(body))
        }
        if (path.length === 4 && path[2] === 'invitations' && method === 'DELETE')
          return await portal.revokeInvitation(db, id, user.id, organizationId.parse(path[3]))
      }
    }
    throw createError({ statusCode: 404, message: 'NOT_FOUND' })
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
