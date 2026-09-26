import { startApplication } from '../utils/applications'
import * as attachments from '../utils/attachments'
import { attachmentConfig } from '../utils/attachment-config'
import { sendAttachment } from '../utils/attachment-download'
import { organizationAgreements } from '../utils/agreements'
import { organizationSets, organizationSet } from '../utils/submission-sets'
import * as responses from '../utils/set-responses'
import { applicantSurvey } from '../utils/surveys'
import { createError, defineEventHandler, getHeader, getQuery, getRequestURL, setHeader } from 'h3'
import { ZodError } from 'zod'
import { useAuth } from '../utils/auth'
import { useDatabase } from '../utils/database'
import { isPortalOriginAllowed } from '../utils/config'
import { parseJsonBody, readBoundedBody, toBoundedRequest } from '../utils/request-body'
import * as portal from '../utils/portal'
import { isGovernmentAccount, requireOrganizationAccount } from '../utils/government-access'
import { fundingCatalogue } from '../utils/government-structure'
import {
  decodePublicId,
  publicReferences,
  resolvePublicInput,
  resolveResponseCode
} from '../utils/public-identifiers'
const internalUserId = (value: string): number => {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw createError({ statusCode: 401, message: 'AUTHENTICATION_REQUIRED' })
  return Number(value)
}
const portalHandler = defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  const method = event.method
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (
      !isPortalOriginAllowed(getHeader(event, 'origin') ?? null, getRequestURL(event).href) ||
      getHeader(event, 'sec-fetch-site') === 'cross-site'
    )
      throw createError({
        statusCode: 403,
        message: 'ORIGIN_FORBIDDEN',
        data: { code: 'ORIGIN_FORBIDDEN' }
      })
  }
  const request = toBoundedRequest(event)
  const upload =
    method === 'POST' &&
    /^\/api\/organizations\/[^/]+\/responses\/[^/]+\/items\/[^/]+\/attachments$/.test(
      getRequestURL(event).pathname
    )
  const body =
    !upload && !['GET', 'HEAD', 'OPTIONS'].includes(method)
      ? await readBoundedBody(
          request,
          /\/responses(?:\/|$)/.test(getRequestURL(event).pathname) ? 3 * 1024 * 1024 : undefined
        )
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
      ? { id: internalUserId(session.user.id), name: session.user.name, email: session.user.email }
      : null
    if (path[0] === 'session' && path.length === 1 && method === 'GET')
      return {
        user,
        governmentAccount: user ? await isGovernmentAccount(db, user.id) : false
      }
    if (!user)
      throw createError({
        statusCode: 401,
        message: 'AUTHENTICATION_REQUIRED',
        data: { code: 'AUTHENTICATION_REQUIRED' }
      })
    if (
      path[0] === 'invitations' &&
      path.length === 3 &&
      path[2] === 'accept' &&
      method === 'POST'
    ) {
      await requireOrganizationAccount(db, user.id)
      return await portal.acceptInvitation(db, path[1]!, user)
    }
    if (path[0] === 'organizations') {
      await requireOrganizationAccount(db, user.id)
      if (path.length === 1) {
        if (method === 'GET') return await portal.listOrganizations(db, user.id)
        if (method === 'POST')
          return await portal.createOrganization(db, user.id, parseJsonBody(body))
      } else {
        const id = decodePublicId(path[1]!, 'organization')
        if (path.length === 3 && method === 'GET') {
          if (path[2] === 'agreements') return await organizationAgreements(db, id, user.id)
          if (path[2] === 'sets') return await organizationSets(db, id, user.id)
          if (path[2] === 'responses') return await responses.listResponses(db, id, user.id)
        }
        if (path.length === 4 && path[2] === 'sets' && method === 'GET')
          return await organizationSet(db, id, user.id, decodePublicId(path[3]!, 'set'))
        if (path.length === 5 && path[2] === 'sets' && path[4] === 'responses' && method === 'POST')
          return await responses.startResponse(
            db,
            id,
            user.id,
            decodePublicId(path[3]!, 'set'),
            resolvePublicInput(parseJsonBody(body))
          )
        if (path.length >= 4 && path[2] === 'responses') {
          const responseId = await resolveResponseCode(db, path[3]!)
          if (upload && path.length === 7) {
            const metadata = await attachments.authorizeAttachmentUpload(
              db,
              id,
              user.id,
              responseId,
              { ...getQuery<Record<string, string>>(event), itemId: path[5] }
            )
            const bytes = await readBoundedBody(request, attachmentConfig().maxBytes)
            return await attachments.uploadAttachment(
              db,
              id,
              user.id,
              responseId,
              metadata,
              bytes ?? new Uint8Array()
            )
          }
          if (path.length === 6 && path[4] === 'attachments') {
            const attachmentId = decodePublicId(path[5]!, 'attachment')
            if (method === 'GET')
              return sendAttachment(
                event,
                await attachments.organizationAttachment(db, id, user.id, responseId, attachmentId)
              )
            if (method === 'DELETE')
              return await attachments.removeAttachment(
                db,
                id,
                user.id,
                responseId,
                attachmentId,
                resolvePublicInput(parseJsonBody(body))
              )
          }

          if (path.length === 4 && method === 'GET')
            return await responses.getResponse(db, id, user.id, responseId)
          if (path.length === 4 && method === 'PUT')
            return await responses.mutateResponse(
              db,
              id,
              user.id,
              responseId,
              'save',
              resolvePublicInput(parseJsonBody(body))
            )
          if (path.length === 4 && method === 'DELETE')
            return await responses.mutateResponse(
              db,
              id,
              user.id,
              responseId,
              'delete',
              resolvePublicInput(parseJsonBody(body))
            )
          if (path.length === 5 && path[4] === 'check' && method === 'POST')
            return await responses.checkResponse(
              db,
              id,
              user.id,
              responseId,
              resolvePublicInput(parseJsonBody(body))
            )
          if (path.length === 5 && path[4] === 'submit' && method === 'POST')
            return await responses.mutateResponse(
              db,
              id,
              user.id,
              responseId,
              'submit',
              resolvePublicInput(parseJsonBody(body))
            )
          if (path.length === 5 && path[4] === 'details' && method === 'POST')
            return await responses.addSubmissionDetail(
              db,
              id,
              user.id,
              responseId,
              resolvePublicInput(parseJsonBody(body))
            )
        }
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
          return await applicantSurvey(db, id, user.id, decodePublicId(path[3]!, 'call'))
        if (
          path.length === 5 &&
          path[2] === 'funding-calls' &&
          path[4] === 'applications' &&
          method === 'POST'
        )
          return await startApplication(
            db,
            id,
            user.id,
            decodePublicId(path[3]!, 'call'),
            resolvePublicInput(parseJsonBody(body))
          )
        if (path.length === 3 && path[2] === 'funding-calls' && method === 'GET')
          return await fundingCatalogue(db, id, user.id)
        if (path.length === 3 && path[2] === 'members' && method === 'GET')
          return await portal.listMembers(db, id, user.id)
        if (path.length === 4 && path[2] === 'members' && method === 'PATCH')
          return await portal.updatePermissions(db, id, user.id, decodePublicId(path[3]!, 'user'), parseJsonBody(body))
        if (path.length === 3 && path[2] === 'transfer' && method === 'POST')
          return await portal.transferOwnership(db, id, user.id, resolvePublicInput(parseJsonBody(body)))
        if (path.length === 3 && path[2] === 'invitations') {
          if (method === 'GET') return await portal.listInvitations(db, id, user.id)
          if (method === 'POST')
            return await portal.createInvitation(db, id, user.id, parseJsonBody(body))
        }
        if (path.length === 4 && path[2] === 'invitations' && method === 'DELETE')
          return await portal.revokeInvitation(
            db,
            id,
            user.id,
            decodePublicId(path[3]!, 'invitation')
          )
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
export default defineEventHandler(async (event) => publicReferences(await portalHandler(event)))
