import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'

export const themeComponents = [
  'ThemeRoot',
  'ThemeShell',
  'ThemeButton',
  'ThemeInput',
  'ThemeSelect',
  'ThemeNotice',
  'ThemeBadge',
  'ThemeLink'
] as const
export interface ThemeManifest {
  name: string
  css: string[]
  modules: string[]
  plugins: string[]
  moduleOptions?: Record<string, unknown>
  customElementPrefixes?: string[]
}

/** Only the chosen theme is registered; runtime inputs never participate in selection. */
export const resolveTheme = (root: string, selection = 'nuxtui') => {
  if (!/^[a-z][a-z0-9-]*$/.test(selection))
    throw new Error('PORTAL_THEME must be a theme directory name.')
  const directory = resolve(root, 'themes', selection)
  const manifestPath = resolve(directory, 'theme.json')
  if (!existsSync(manifestPath))
    throw new Error(
      `Unknown PORTAL_THEME "${selection}". Add themes/${selection}/theme.json first.`
    )
  const manifest: ThemeManifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (
    !manifest ||
    typeof manifest.name !== 'string' ||
    !manifest.name.trim() ||
    !['css', 'modules', 'plugins'].every(
      (key) =>
        Array.isArray(manifest[key as keyof ThemeManifest]) &&
        (manifest[key as keyof ThemeManifest] as unknown[]).every(
          (value) => typeof value === 'string'
        )
    )
  )
    throw new Error(`Invalid theme manifest: ${manifestPath}`)
  if (
    manifest.moduleOptions !== undefined &&
    (typeof manifest.moduleOptions !== 'object' ||
      manifest.moduleOptions === null ||
      Array.isArray(manifest.moduleOptions))
  )
    throw new Error(`Invalid module options: ${manifestPath}`)
  if (
    manifest.customElementPrefixes !== undefined &&
    (!Array.isArray(manifest.customElementPrefixes) ||
      !manifest.customElementPrefixes.every(
        (prefix) => typeof prefix === 'string' && /^[a-z][a-z0-9-]*-$/.test(prefix)
      ))
  )
    throw new Error(`Invalid custom element prefixes: ${manifestPath}`)
  const localPath = (file: string) => {
    const path = resolve(directory, file)
    if (!path.startsWith(`${directory}${sep}`) || !existsSync(path) || !statSync(path).isFile())
      throw new Error(`Missing or unsafe theme file: ${file}`)
    return path
  }
  for (const name of themeComponents) localPath(`components/${name}.vue`)
  return {
    id: selection,
    directory,
    name: manifest.name,
    css: manifest.css.map(localPath),
    plugins: manifest.plugins.map(localPath),
    modules: manifest.modules,
    moduleOptions: manifest.moduleOptions ?? {},
    customElementPrefixes: manifest.customElementPrefixes ?? []
  }
}
