import { hashPassword } from 'better-auth/crypto'
import { v7 as uuid } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema'
import { bootstrapInput } from '../../shared/schemas/government'

export const createAdministrator = async (db: Kysely<Database>, input: unknown) => {
  const data = bootstrapInput.parse(input)
  const passwordHash = await hashPassword(data.password)
  const id = uuid()
  await db
    .insertInto('administrator')
    .values({
      id,
      name: data.name,
      email: data.email,
      passwordHash,
      active: true,
      createdAt: new Date()
    })
    .execute()
  return { id }
}
