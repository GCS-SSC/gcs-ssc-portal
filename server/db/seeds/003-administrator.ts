import type { Kysely } from 'kysely'
import type { Database } from '../schema'
import { createAdministrator } from '../../utils/administrator-accounts'
import { demoPassword } from './001-demo'

export const administratorSeed = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const legacy = await db.selectFrom('government_user').select('userId').execute()
    for (const { userId } of legacy) {
      await db.deleteFrom('session').where('userId', '=', userId).execute()
      await db.deleteFrom('account').where('userId', '=', userId).execute()
    }
    // Remove untouched demo-only staff fixtures. Keep edited historical identities as deny markers.
    for (const name of ['root', 'staff'] as const) {
      const person = await db
        .selectFrom('government_user as g')
        .innerJoin('user as u', 'u.id', 'g.userId')
        .select(['u.id', 'u.name', 'u.email'])
        .where('g.role', '=', name)
        .where('u.email', '=', `${name}@portal.com`)
        .executeTakeFirst()
      if (!person || person.name !== `Demo ${name}`) continue
      if (
        await db
          .selectFrom('membership')
          .select('userId')
          .where('userId', '=', person.id)
          .executeTakeFirst()
      )
        continue
      const referenced = await Promise.all([
        db
          .selectFrom('organization')
          .select('id')
          .where('ownerId', '=', person.id)
          .executeTakeFirst(),
        db
          .selectFrom('invitation')
          .select('id')
          .where('createdBy', '=', person.id)
          .executeTakeFirst(),
        db
          .selectFrom('set_response')
          .select('id')
          .where('createdBy', '=', person.id)
          .executeTakeFirst(),
        db
          .selectFrom('set_response')
          .select('id')
          .where('updatedBy', '=', person.id)
          .executeTakeFirst(),
        db
          .selectFrom('set_response')
          .select('id')
          .where('submittedBy', '=', person.id)
          .executeTakeFirst(),
        db
          .selectFrom('response_attachment')
          .select('id')
          .where('createdBy', '=', person.id)
          .executeTakeFirst()
      ])
      if (referenced.some(Boolean)) continue
      const grants = await db
        .selectFrom('agency_staff as s')
        .innerJoin('agency as a', 'a.id', 's.agencyId')
        .select('a.nameEn')
        .where('s.userId', '=', person.id)
        .execute()
      if (grants.some((grant) => grant.nameEn !== 'Demo Funding Agency')) continue
      await db.deleteFrom('agency_staff').where('userId', '=', person.id).execute()
      await db.deleteFrom('government_user').where('userId', '=', person.id).execute()
      await db.deleteFrom('user').where('id', '=', person.id).execute()
    }
    if (await db.selectFrom('administrator').select('id').executeTakeFirst()) return
    await createAdministrator(db, {
      name: 'Demo Administrator',
      email: 'admin@portal.com',
      password: demoPassword
    })
  }
}
