import { hashPassword } from 'better-auth/crypto'
import type { Kysely } from 'kysely'
import type { Database } from '../schema'
import { demoAccounts, demoPassword } from './001-demo'

export const simpleCredentialsMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const password = await hashPassword(demoPassword)
    for (const name of demoAccounts) {
      const user = await db
        .selectFrom('user')
        .select('id')
        .where('email', '=', `${name}@demo.example.test`)
        .executeTakeFirst()
      if (!user) continue
      await db
        .updateTable('user')
        .set({ email: `${name}@portal.com`, updatedAt: new Date() })
        .where('id', '=', user.id)
        .execute()
      await db
        .updateTable('account')
        .set({ password, updatedAt: new Date() })
        .where('userId', '=', user.id)
        .where('providerId', '=', 'credential')
        .execute()
    }
  }
}
