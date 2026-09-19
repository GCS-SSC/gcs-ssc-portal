import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { resolveTheme, themeComponents } from '../../tooling/theme'
import { en, fr } from '../../app/locales/messages'

describe('build-time theme boundary', () => {
  it('selects exactly one complete vendor adapter', () => {
    const nuxt = resolveTheme(process.cwd(), 'nuxtui')
    const gc = resolveTheme(process.cwd(), 'gcdesign')
    expect(nuxt.modules).toEqual(['@nuxt/ui'])
    expect(gc.modules).not.toContain('@nuxt/ui')
    expect(gc.css.every((path) => path.includes('/themes/gcdesign/'))).toBe(true)
    expect(nuxt.css.every((path) => path.includes('/themes/nuxtui/'))).toBe(true)
  })
  it('accepts a dropped-in complete theme without changing a registry', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'portal-theme-test-'))
    try {
      const directory = resolve(root, 'themes', 'custom', 'components')
      mkdirSync(directory, { recursive: true })
      for (const component of themeComponents)
        writeFileSync(resolve(directory, `${component}.vue`), '<template><slot /></template>')
      writeFileSync(
        resolve(directory, '../theme.json'),
        JSON.stringify({ name: 'Custom', css: [], modules: [], plugins: [] })
      )
      expect(resolveTheme(root, 'custom').name).toBe('Custom')
      writeFileSync(
        resolve(directory, '../theme.json'),
        JSON.stringify({ name: 'Bad path', css: ['../../outside.css'], modules: [], plugins: [] })
      )
      expect(() => resolveTheme(root, 'custom')).toThrow('unsafe theme file')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
  it('fails closed for unknown or incomplete themes and traversal', () => {
    expect(() => resolveTheme(process.cwd(), '../nuxtui')).toThrow('directory name')
    expect(() => resolveTheme(process.cwd(), 'absent')).toThrow('Unknown PORTAL_THEME')
  })
  it('keeps application screens free of vendor controls and imports', () => {
    const walk = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(resolve(directory, entry.name))
          : [resolve(directory, entry.name)]
      )
    for (const file of walk(resolve('app')).filter((path) => /\.(vue|ts)$/.test(path))) {
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
