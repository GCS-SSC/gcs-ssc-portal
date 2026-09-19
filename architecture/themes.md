# Build-time themes

`nuxt.config.ts` resolves `PORTAL_THEME` (default `nuxtui`) once through `tooling/theme.ts`. The resolver loads `themes/<name>/theme.json`, validates local paths and the required component set, and registers only that theme's components, CSS, plugins and modules. Unknown, incomplete, or unsafe selections fail the build. No request data, runtime configuration, browser state, or UI setting selects themes.

## Contract

Every theme implements these files in its `components/` directory. Props are defined in `shared/types/theme.ts`; application screens must never import vendor components directly.

| Component     | Contract                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ThemeRoot`   | Default slot; provides any vendor application context.                                                                                                          |
| `ThemeShell`  | `locale`, `signedIn`, `userName`, `currentPath`; emits `locale` and `signout`; owns header, navigation, main landmark, footer and default content slot.         |
| `ThemeButton` | `type`, `variant`, `disabled`, `loading`; default slot and click; default type is button. Submit/reset must work inside native forms.                           |
| `ThemeInput`  | String `modelValue`, `id`, `label`, type and field metadata; emits string `update:modelValue`. Label, requirement, hint and error belong to the actual control. |
| `ThemeSelect` | String `modelValue`, `id`, `label`, `{value,label}` options and field metadata; emits string `update:modelValue`. An empty option represents the placeholder.   |
| `ThemeNotice` | `variant`, optional title, default message slot, appropriate live announcement.                                                                                 |
| `ThemeBadge`  | `tone` and default text slot.                                                                                                                                   |
| `ThemeLink`   | `to`, optional `external`, default slot; preserves link and keyboard semantics.                                                                                 |

Adapters map the complete contract rather than exposing vendor-specific props to pages. Semantic HTML for headings, forms, lists and tables remains shared. Presentation primitives go through the theme; native layout elements do not need a wrapper with no behavior.

## Manifest

```json
{
  "name": "My theme",
  "css": ["theme.css"],
  "modules": [],
  "plugins": []
}
```

CSS/plugin paths are relative to the theme directory and must exist within it. Modules are trusted Nuxt module names installed as dependencies. Optional `moduleOptions` supplies vendor module configuration; optional `customElementPrefixes` declares web-component prefixes such as `["gcds-"]`. These remain inside the selected theme rather than adding vendor conditions to host configuration. Component filenames are fixed; there is no central registry to edit. Add any vendor dependency normally, implement the contract, then build with `PORTAL_THEME=my-theme`.

Nuxt UI wraps `UApp`, buttons, inputs, selects, alerts, badges and links. GC Design System wraps the official Vue components; its badge has a semantic local fallback because the vendor has no equivalent primitive. GCDS web-component events and form-submit behavior are adapted at the theme boundary. Both shells follow a government service layout without changing application features.

## Verification

The same browser suite must pass against each selected theme's production artifact. Test form submission, required attributes and labels, disabled/loading behavior, selection placeholders, link navigation, language changes, mobile overflow and keyboard access. `tests/tooling/theme.test.ts` also rejects vendor imports in host pages and proves new complete directories can be selected without editing the resolver.

Adding a shared component requires updating the contract, required component inventory and every maintained theme together. Theme styles are trusted code and may use ordinary CSS; keep vendor-specific CSS in its owning directory.

`ThemeShell` also accepts optional `navigation: {to,label}[]` and `portalTitle` so the host can render separate government navigation. The host supplies authorized destinations and translated titles; adapters render the same contract in both themes.

`ThemeFile` supplies an optional file selector (`id`, `label`, `hint`, `disabled`) and emits `change(File | null)`. Host components own upload actions, policy, limits and network state. Both built-in themes use their vendor file control.
