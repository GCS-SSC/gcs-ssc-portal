import type { Dialect, Driver } from 'kysely'
import { KyselyPGlite } from 'kysely-pglite'
/** PGlite has one backend connection. Lease it for whole Kysely transactions. */
export const pgliteDialect = (directory: string): Dialect => {
  const dialect = new KyselyPGlite(directory).dialect
  return {
    ...dialect,
    createDriver: (): Driver => {
      const driver = dialect.createDriver()
      let tail = Promise.resolve()
      let releaseLease: (() => void) | undefined
      return {
        init: () => driver.init(),
        acquireConnection: async () => {
          const previous = tail
          let release!: () => void
          tail = new Promise<void>((resolve) => {
            release = resolve
          })
          await previous
          releaseLease = release
          try {
            return await driver.acquireConnection()
          } catch (error) {
            release()
            throw error
          }
        },
        releaseConnection: async (connection) => {
          try {
            await driver.releaseConnection(connection)
          } finally {
            releaseLease?.()
            releaseLease = undefined
          }
        },
        beginTransaction: (connection, settings) => driver.beginTransaction(connection, settings),
        commitTransaction: (connection) => driver.commitTransaction(connection),
        rollbackTransaction: (connection) => driver.rollbackTransaction(connection),
        destroy: () => driver.destroy()
      }
    }
  }
}
