import { Kysely, PostgresDialect } from 'kysely'
import { pgliteDialect } from '../db/pglite-dialect'
import pg from 'pg'
import { mkdir } from 'node:fs/promises'
import type { Database } from '../db/schema'
import { migrate } from '../db/migrations'
export const createDatabase = async (options: { url?: string; directory?: string } = {}) => {
  if (!options.url && options.directory && options.directory !== 'memory://')
    await mkdir(options.directory, { recursive: true })
  const dialect = options.url
    ? new PostgresDialect({ pool: new pg.Pool({ connectionString: options.url, max: 10 }) })
    : pgliteDialect(options.directory ?? 'memory://')
  const db = new Kysely<Database>({ dialect })
  try {
    await migrate(db)
    return db
  } catch (error) {
    await db.destroy()
    throw error
  }
}
let instance: Promise<Kysely<Database>> | undefined
export const useDatabase = () =>
  (instance ??= createDatabase({
    url: process.env.DATABASE_URL,
    directory: process.env.PGLITE_DATA_DIR || '.data/pglite'
  }))

export const closeDatabase = async () => {
  const current = instance
  instance = undefined
  if (current) await (await current).destroy()
}
