import type { Kysely } from 'kysely'
import type { Database } from '../schema'

const organizations = [
  {
    name: 'Demo Harbour Community Services',
    description: 'Local programs and services for coastal communities.'
  },
  {
    name: 'Demo Atlantic Skills Network',
    description: 'Regional training and employment partnerships.'
  }
] as const

/** Give the demo owner several organizations to exercise the organization switcher. */
export const demoOrganizationsMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const owner = await db
      .selectFrom('user')
      .select('id')
      .where('email', '=', 'owner@portal.com')
      .executeTakeFirstOrThrow()
    const now = Date.now()

    for (const [index, example] of organizations.entries()) {
      const createdAt = new Date(now + index)
      const organization = await db
        .insertInto('organization')
        .values({ ...example, ownerId: owner.id, createdAt })
        .returning('id')
        .executeTakeFirstOrThrow()
      const id = organization.id
      await db
        .insertInto('membership')
        .values({ organizationId: id, userId: owner.id, joinedAt: createdAt })
        .execute()
      await db
        .insertInto('permission')
        .values(
          (
            [
              'admin',
              'application:manager',
              'claim:manager',
              'forecast:manager',
              'form:manager'
            ] as const
          ).map((permission) => ({ organizationId: id, userId: owner.id, permission }))
        )
        .execute()
    }
  }
}
