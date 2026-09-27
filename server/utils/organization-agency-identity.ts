import { z } from 'zod'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'
import { governmentFail as fail, requireGovernment, type GovernmentActor } from './government-access'
import { decodePublicId, encodePublicId } from './public-identifiers'

const identityInput = z.object({
  foreignApplicantRecipientId: z.string().regex(/^[1-9]\d{0,18}$/)
}).strict()

export const listAgencyOrganizations = async (
  db: Kysely<Database>, actor: GovernmentActor, agencyId: number, query: unknown = {}
) => {
  const { search, after } = z.object({
    search: z.string().trim().min(2).max(120).optional(),
    after: z.string().optional()
  }).parse(query)
  await requireGovernment(db, actor, { agencyId })
  const afterId = after ? decodePublicId(after, 'organization') : null
  const pattern = search ? `%${search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%` : null
  const rows = await db.selectFrom('organization as organization')
    .innerJoin('user as owner', 'owner.id', 'organization.ownerId')
    .leftJoin('organization_agency_identity as identity', (join) => join
      .onRef('identity.organizationId', '=', 'organization.id')
      .on('identity.agencyId', '=', agencyId))
    .select(['organization.id', 'organization.name', 'organization.description', 'organization.active',
      'owner.name as ownerName', 'owner.email as ownerEmail',
      'identity.foreignApplicantRecipientId', 'identity.verifiedAt'])
    .select(eb => [
      eb.selectFrom('membership').select(eb => eb.fn.countAll<number>().as('memberCount'))
        .whereRef('membership.organizationId', '=', 'organization.id').as('memberCount'),
      eb.selectFrom('funding_agreement').select(eb => eb.fn.countAll<number>().as('agreementCount'))
        .whereRef('funding_agreement.organizationId', '=', 'organization.id')
        .where('funding_agreement.agencyId', '=', agencyId).as('agreementCount')
    ])
    .$if(Boolean(pattern), (builder) => builder.where('organization.name', 'ilike', pattern!))
    .$if(afterId !== null, builder => builder.where('organization.id', '>', afterId!))
    .orderBy('organization.id').limit(101).execute()
  const page = rows.slice(0, 100)
  return { organizations: page.map((row) => ({ ...row,
    memberCount: Number(row.memberCount),
    agreementCount: Number(row.agreementCount),
    verified: row.verifiedAt !== null,
    verifiedAt: row.verifiedAt ? new Date(row.verifiedAt).toISOString() : null
  })), nextAfter: rows.length > 100 ? encodePublicId(page[page.length - 1]!.id, 'organization') : null }
}

export const verifyAgencyOrganization = async (
  db: Kysely<Database>, actor: GovernmentActor, agencyId: number,
  organizationId: number, body: unknown
) => {
  const input = identityInput.parse(body)
  return db.transaction().execute(async (tx) => {
    await requireGovernment(tx, actor, { agencyId, lock: true })
    const organization = await tx.selectFrom('organization').select(['id', 'active'])
      .where('id', '=', organizationId).forUpdate().executeTakeFirst()
    if (!organization || !organization.active) return fail(404, 'ORGANIZATION_NOT_FOUND')
    const existing = await tx.selectFrom('organization_agency_identity').selectAll()
      .where('agencyId', '=', agencyId).where('organizationId', '=', organizationId)
      .forUpdate().executeTakeFirst()
    if (existing && existing.foreignApplicantRecipientId !== input.foreignApplicantRecipientId)
      return fail(409, 'EXTERNAL_IDENTITY_IMMUTABLE')
    const conflictingLink = await tx.selectFrom('agreement_organization')
      .select('agreementId').where('agencyId', '=', agencyId)
      .where('organizationId', '=', organizationId)
      .where('foreignApplicantRecipientId', 'is not', null)
      .where('foreignApplicantRecipientId', '!=', input.foreignApplicantRecipientId)
      .executeTakeFirst()
    if (conflictingLink) return fail(409, 'AGREEMENT_RECIPIENT_MISMATCH')
    if (!existing) await tx.insertInto('organization_agency_identity').values({
      agencyId, organizationId, foreignApplicantRecipientId: input.foreignApplicantRecipientId,
      verifiedAt: new Date()
    }).execute()
    await tx.updateTable('organization').set({ verified: true }).where('id', '=', organizationId).execute()
    return { organizationId, foreignApplicantRecipientId: input.foreignApplicantRecipientId, verified: true }
  })
}
