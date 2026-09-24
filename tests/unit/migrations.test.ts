import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MigrationResult } from 'kysely'
import { reportMigrationResults } from '../../server/db/migrations'

afterEach(() => vi.restoreAllMocks())

describe('migration startup reporting', () => {
  it('reports applied and failed migrations using the GCS–SSC startup format', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const results: MigrationResult[] = [
      { migrationName: '001_initial', direction: 'Up', status: 'Success' },
      { migrationName: '002_government', direction: 'Up', status: 'Error' },
      { migrationName: '003_surveys', direction: 'Up', status: 'NotExecuted' }
    ]

    reportMigrationResults(results)

    expect(info).toHaveBeenCalledWith('migration "001_initial" was executed successfully')
    expect(error).toHaveBeenCalledWith('failed to execute migration "002_government"')
    expect(info).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('identifies demo migrations in startup output', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    reportMigrationResults(
      [{ migrationName: '001_demo', direction: 'Up', status: 'Success' }],
      'demo migration'
    )

    expect(info).toHaveBeenCalledWith('demo migration "001_demo" was executed successfully')
  })
})
