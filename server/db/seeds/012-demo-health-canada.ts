import type { Kysely } from 'kysely'
import type { Database } from '../schema'
import { secretHash } from '../../utils/government-access'

/** Public development credential; never issue it in a production process by default. */
export const healthCanadaDemoToken = 'gcs_PgdzCAcAAc5UJO42TvnGK8QgSQSv-fWhM-vTd0sfyPo'

const organizations = [
  {
    name: 'Shopify Inc.',
    description:
      'Commerce platform and merchant services; Health Canada connector verification example.',
    active: true
  },
  {
    name: 'Northern Community Health Initiative',
    description: 'Community-led health outreach in northern and remote communities.',
    active: true
  },
  {
    name: 'Former Health Partnership',
    description: 'Inactive example retained for historical organization-link testing.',
    active: false
  }
] as const

/** Add counterpart records without modifying existing demo organizations or agency fixtures. */
export const demoHealthCanadaMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const owner = await db
      .selectFrom('user')
      .select('id')
      .where('email', '=', 'owner@portal.com')
      .executeTakeFirstOrThrow()
    const contributor = await db
      .selectFrom('user')
      .select('id')
      .where('email', '=', 'contributor@portal.com')
      .executeTakeFirstOrThrow()
    const now = new Date()
    const agency = await db
      .insertInto('agency')
      .values({
        nameEn: 'Health Canada',
        nameFr: 'Santé Canada',
        createdAt: now
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    for (const [index, example] of organizations.entries()) {
      const createdAt = new Date(now.getTime() + index)
      const organization = await db
        .insertInto('organization')
        .values({
          name: example.name,
          description: example.description,
          active: example.active,
          ownerId: owner.id,
          createdAt
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      const members = index === 0 ? [owner.id, contributor.id] : [owner.id]
      await db
        .insertInto('membership')
        .values(
          members.map((userId) => ({
            organizationId: organization.id,
            userId,
            joinedAt: createdAt
          }))
        )
        .execute()
      await db
        .insertInto('permission')
        .values([
          ...(
            [
              'admin',
              'application:manager',
              'claim:manager',
              'forecast:manager',
              'form:manager'
            ] as const
          ).map((permission) => ({
            organizationId: organization.id,
            userId: owner.id,
            permission
          })),
          ...(index === 0
            ? (
                [
                  'application:contributor',
                  'claim:contributor',
                  'forecast:contributor',
                  'form:contributor'
                ] as const
              ).map((permission) => ({
                organizationId: organization.id,
                userId: contributor.id,
                permission
              }))
            : [])
        ])
        .execute()
    }

    const token =
      process.env.PORTAL_DEMO_HEALTH_CANADA_TOKEN ??
      (process.env.NODE_ENV === 'production' ? null : healthCanadaDemoToken)
    if (token) {
      if (!/^gcs_[A-Za-z0-9_-]{43}$/.test(token))
        throw new Error('PORTAL_DEMO_HEALTH_CANADA_TOKEN must be a valid integration token')
      await db
        .insertInto('integration_token')
        .values({
          name: 'Health Canada local connector demo',
          agencyId: agency.id,
          tokenHash: secretHash(token),
          expiresAt: new Date(now.getTime() + 365 * 86400000),
          revoked: false,
          createdAt: now
        })
        .execute()
    }
  }
}
