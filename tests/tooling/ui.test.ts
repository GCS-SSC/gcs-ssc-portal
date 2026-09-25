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
      // Layout and content must use the same official primitives as the controls.
      expect(content, file).not.toMatch(/<(?:h[1-6]|p|table|fieldset)(?:\s|>)/)
    }
  })
  it('does not rescale or repaint GCDS controls', () => {
    for (const file of ['app/assets/css/main.css', 'app/assets/css/gcds.css']) {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(css, file).not.toMatch(/::part\(|h1::after|!important/)
      for (const root of css.matchAll(/:root\s*\{([^}]+)\}/g)) {
        expect(root[1], file).not.toMatch(/(?:font-size|font)\s*:/)
      }
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
