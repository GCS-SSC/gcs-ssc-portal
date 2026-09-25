# GC Design System integration

GC Design System is the portal's sole presentation system. Nuxt remains the application framework; Nuxt UI, selectable themes, theme manifests, and theme-specific build commands have been removed.

`nuxt.config.ts` registers `app/components/` and the shared and GCDS styles directly. Official Vue proxies register their custom elements on use; Table has an explicit registration bridge documented in the GC architecture. The client plugin is currently a no-op. Application pages use the `Portal*` components in `app/components/ui/`; the wrappers handle Vue events, form behavior, locale context, and the application contract rather than implementing alternative visual controls. `app/app.vue` supplies the root `gc-theme` scope directly.

Read [gcdesign.md](gcdesign.md) before selecting a component or changing styling. Its official-component policy includes layout, typography, and the documented badge gap. New presentation needs should use the appropriate GCDS component; add an integration wrapper only where a shared contract or behavior requires it. There is no parallel UI implementation to maintain.

## Contracts

Shared form and shell props are defined in `shared/types/ui.ts`; the layout, navigation and typed table adapters declare their small contracts alongside the implementation.

| Component      | Responsibility                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PortalShell`  | Government header, account navigation, language changes, parent breadcrumbs, main landmark, footer, and default content slot. Receives authorized navigation and portal title from the host; emits locale and signout. |
| `PortalButton` | Button type, variant, disabled/loading state, and click event; submit/reset works with native forms.                                                                                                                   |
| `PortalInput`  | String value, visible label, field requirements, hint/error metadata, and value updates.                                                                                                                               |
| `PortalSelect` | String value and value/label options, including a placeholder; field requirements and accessible metadata.                                                                                                             |
| `PortalFile`   | Optional file selector emitting `File` or `null`; callers own upload policy and network state.                                                                                                                         |
| `PortalNotice` | Variant, title, content, and appropriate live announcement.                                                                                                                                                            |
| `PortalBadge`  | Readable status text; supports fixed tones and validated agreement status colours using the bounded fallback documented in the GC architecture.                                                                        |
| `PortalLink`   | Internal/external destination and normal link/keyboard semantics; button-style destinations use GCDS size and role options.                                                                                            |

The shell provides `portal-locale` for localized adapter copy. Vendor imports belong in these integration components and the registration plugin, not in business pages. Business components own data loading and actions and compose the shared integration components.

Layout and content adapters are `PortalContainer`, `PortalGrid`, `PortalHeading` (explicit `tag`), `PortalText`, `PortalScreenreaderOnly`, `PortalFieldset`, and `PortalDetails` (optional disclosure with a distinct title). They expose native documented options without visual overrides. `PortalSideNav` receives labelled destinations/current state and bridges ordinary activation to Nuxt. `PortalTable` receives typed rows, named columns, a caption, and live scoped cell slots.

`RecordSummary` is a shared composition of those adapters rather than a new control. Callers provide `title`, `details`, optional supporting `actions`, and an optional right-side `cta` button through slots; it does not own destinations or authorization.

## Styling and verification

GCDS integration styles live in `app/assets/css/gcds.css`; shared page layout currently lives in `app/assets/css/main.css`. Sizing defaults and bounded capability gaps are recorded in [gcdesign.md](gcdesign.md).

Run `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:e2e` for relevant implementation changes. Browser verification builds one production artifact and exercises the real GCDS shadow controls, language switching, forms, mobile layout, and keyboard interaction. Never rebuild `.output` while a verification server owns it.

`tests/tooling/ui.test.ts` guards vendor isolation, native content primitives, CSS sizing boundaries, and bilingual interface contracts. Browser checks remain necessary to verify actual control semantics.
