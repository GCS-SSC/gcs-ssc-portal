import { setEvidenceActor } from '../../utils/evidence'
import {
  governmentAttachment,
  authorizeGovernmentUpload,
  uploadGovernmentAttachment,
  removeGovernmentAttachment
} from '../../utils/attachments'
import { attachmentConfig } from '../../utils/attachment-config'
import { sendAttachment } from '../../utils/attachment-download'
import { getQuery, createError, defineEventHandler, getHeader, getRequestURL, setHeader } from 'h3'
import * as agreements from '../../utils/agreements'
import * as sets from '../../utils/submission-sets'
import * as responses from '../../utils/set-responses'
import { ZodError, z } from 'zod'
import { useDatabase } from '../../utils/database'
import { isPortalOriginAllowed } from '../../utils/config'
import { parseJsonBody, readBoundedBody, toBoundedRequest } from '../../utils/request-body'
import {
  governmentFail as fail,
  requireGovernment,
  secretHash,
  type GovernmentActor
} from '../../utils/government-access'
import * as surveys from '../../utils/surveys'
import * as structure from '../../utils/government-structure'
import {
  decodePublicId,
  encodePublicId,
  publicReferences,
  resolvePublicInput,
  resolveResponseCode,
  type PublicIdKind
} from '../../utils/public-identifiers'
const governmentHandler = defineEventHandler(async (event) => {
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
  const upload =
    method === 'POST' && path[0] === 'submissions' && path.length === 3 && path[2] === 'attachments'
  if (
    mutation &&
    getHeader(event, 'origin') &&
    !isPortalOriginAllowed(getHeader(event, 'origin') ?? null, getRequestURL(event).href)
  )
    fail(403, 'ORIGIN_FORBIDDEN')
  const request = toBoundedRequest(event)
  const body =
    mutation && !upload
      ? await readBoundedBody(
          request,
          ['surveys', 'agreements', 'sets'].includes(path[0] ?? '') ? 256 * 1024 : undefined
        )
      : undefined
  const db = await useDatabase()
  try {
    if (!authorization || !/^Bearer gcs_[A-Za-z0-9_-]{43}$/.test(authorization))
      return fail(401, 'INVALID_INTEGRATION_TOKEN')
    const actor: GovernmentActor = {
      kind: 'integration',
      tokenHash: secretHash(authorization.slice(7))
    }
    const authority = await requireGovernment(db, actor)
    if (authority.tokenId)
      setEvidenceActor(event, {
        kind: 'integration',
        id: authority.tokenId,
        agencyId: authority.agencyIds[0]
      })
    const routeKinds: Record<string, PublicIdKind> = {
      agencies: 'agency',
      programs: 'program',
      streams: 'stream',
      calls: 'call',
      surveys: 'survey',
      agreements: 'agreement',
      sets: 'set',
      submissions: 'response'
    }
    const decodedId =
      path[1] && routeKinds[path[0]!] ? decodePublicId(path[1], routeKinds[path[0]!]!) : undefined
    const id =
      decodedId && path[0] === 'submissions' ? await resolveResponseCode(db, path[1]!) : decodedId
    if (id && upload) {
      const metadata = await authorizeGovernmentUpload(db, actor, id, getQuery(event))
      const bytes = await readBoundedBody(request, attachmentConfig().maxBytes)
      return await uploadGovernmentAttachment(db, actor, id, metadata, bytes ?? new Uint8Array())
    }
    if (
      id &&
      path[0] === 'submissions' &&
      path.length === 4 &&
      path[2] === 'attachments' &&
      method === 'DELETE'
    )
      return await removeGovernmentAttachment(
        db,
        actor,
        id,
        decodePublicId(path[3]!, 'attachment'),
        resolvePublicInput(parseJsonBody(body))
      )
    if (
      id &&
      path[0] === 'submissions' &&
      path.length === 3 &&
      path[2] === 'details' &&
      method === 'POST'
    )
      return await responses.addGovernmentDetail(
        db,
        actor,
        id,
        resolvePublicInput(parseJsonBody(body))
      )
    if (
      id &&
      path[0] === 'submissions' &&
      path.length === 4 &&
      path[2] === 'attachments' &&
      method === 'GET'
    )
      return sendAttachment(
        event,
        await governmentAttachment(db, actor, id, decodePublicId(path[3]!, 'attachment'))
      )
    if (
      id &&
      path[0] === 'submissions' &&
      path.length === 3 &&
      path[2] === 'response' &&
      method === 'GET'
    )
      return await responses.governmentResponse(db, actor, id)
    if (
      id &&
      path[0] === 'submissions' &&
      path.length === 3 &&
      path[2] === 'status' &&
      method === 'PUT'
    )
      return await responses.updateSubmissionStatus(
        db,
        actor,
        id,
        resolvePublicInput(parseJsonBody(body))
      )
    if (id && path.length === 3 && path[0] === 'agencies' && method === 'GET') {
      if (path[2] === 'agreements') return await agreements.listAgreements(db, actor, id)
      if (path[2] === 'sets') return await sets.listSets(db, actor, id)
      if (path[2] === 'submissions')
        return await responses.listSubmissions(
          db,
          actor,
          id,
          z.coerce.number().int().min(0).max(1000000).default(0).parse(getQuery(event).offset)
        )
    }
    if (path.length === 1 && method === 'POST') {
      if (path[0] === 'agreements')
        return await agreements.saveAgreement(db, actor, resolvePublicInput(parseJsonBody(body)))
      if (path[0] === 'sets')
        return await sets.saveSet(db, actor, resolvePublicInput(parseJsonBody(body)))
    }
    if (id && path.length === 2) {
      if (path[0] === 'agreements' && method === 'GET')
        return await agreements.getAgreement(db, actor, id)
      if (path[0] === 'agreements' && method === 'PUT')
        return await agreements.saveAgreement(
          db,
          actor,
          resolvePublicInput(parseJsonBody(body)),
          id
        )
      if (path[0] === 'sets' && method === 'GET') return await sets.getSet(db, actor, id)
      if (path[0] === 'sets' && method === 'PUT')
        return await sets.saveSet(db, actor, resolvePublicInput(parseJsonBody(body)), id)
      if (path[0] === 'submissions' && method === 'GET')
        return await responses.exportSubmission(db, actor, id)
    }
    if (
      id &&
      path.length === 3 &&
      path[0] === 'agreements' &&
      path[2] === 'balances' &&
      method === 'PUT'
    )
      return await agreements.updateBalances(db, actor, id, resolvePublicInput(parseJsonBody(body)))
    if (
      id &&
      path.length === 3 &&
      path[0] === 'sets' &&
      method === 'POST' &&
      ['publish', 'withdraw'].includes(path[2]!)
    )
      return await sets.publishSet(
        db,
        actor,
        id,
        resolvePublicInput(parseJsonBody(body)),
        path[2] === 'publish'
      )
    if (path.length === 1) {
      if (method === 'GET') {
        if (path[0] === 'agencies') return await structure.listAgencies(db, actor)
      }
      if (method === 'POST') {
        const input = parseJsonBody(body)
        if (path[0] === 'surveys')
          return await surveys.createSurvey(db, actor, resolvePublicInput(input))
        if (path[0] === 'programs')
          return await structure.createProgram(db, actor, resolvePublicInput(input))
        if (path[0] === 'streams')
          return await structure.createStream(db, actor, resolvePublicInput(input))
        if (path[0] === 'calls') {
          const result = await structure.saveCall(db, actor, resolvePublicInput(input))
          return { id: encodePublicId(result.id, 'call') }
        }
      }
    }
    if (id && path.length === 2) {
      if (path[0] === 'surveys' && method === 'GET') return await surveys.getSurvey(db, actor, id)
      if (path[0] === 'surveys' && method === 'PUT')
        return await surveys.updateSurvey(db, actor, id, resolvePublicInput(parseJsonBody(body)))
      if (path[0] === 'agencies' && method === 'GET')
        return await structure.agencyStructure(db, actor, id)
      if (method === 'PATCH') {
        const input = parseJsonBody(body)
        if (path[0] === 'agencies')
          return await structure.updateAgency(db, actor, id, resolvePublicInput(input))
        if (path[0] === 'programs')
          return await structure.updateStructureName(
            db,
            actor,
            'program',
            id,
            resolvePublicInput(input)
          )
        if (path[0] === 'streams')
          return await structure.updateStructureName(
            db,
            actor,
            'stream',
            id,
            resolvePublicInput(input)
          )
      }
      if (path[0] === 'calls' && method === 'PUT') {
        const result = await structure.saveCall(
          db,
          actor,
          resolvePublicInput(parseJsonBody(body)),
          id
        )
        return { id: encodePublicId(result.id, 'call') }
      }
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
      return await surveys.attachSurvey(db, actor, id, resolvePublicInput(parseJsonBody(body)))
    if (id && path.length === 3 && method === 'PATCH') {
      if (path[0] === 'calls' && path[2] === 'publication')
        return await structure.publishCall(db, actor, id, resolvePublicInput(parseJsonBody(body)))
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
export default defineEventHandler(async (event) => publicReferences(await governmentHandler(event)))
