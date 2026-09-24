import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { en, fr } from '../../app/locales/messages'

describe('GC Design System integration boundary', () => {
  it('keeps application screens free of vendor controls and imports', () => {
    const walk = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(resolve(directory, entry.name))
          : [resolve(directory, entry.name)]
      )
    for (const file of walk(resolve('app')).filter(
      (path) =>
        /\.(vue|ts)$/.test(path) &&
        !path.startsWith(resolve('app/components/ui') + '/') &&
        path !== resolve('app/plugins/gcds.client.ts')
    )) {
      const content = readFileSync(file, 'utf8')
      expect(content, file).not.toMatch(/@nuxt\/ui|@gcds-core|<U[A-Z]|<Gcds|<gcds-/)
    }
  })
})

describe('bilingual interface contract', () => {
  it('has matching keys and named parameters in both languages', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(fr[key].match(/\{\w+\}/g) ?? [], key).toEqual(en[key].match(/\{\w+\}/g) ?? [])
    }
  })
})
