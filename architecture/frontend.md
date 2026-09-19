# Frontend conventions

## Structure and state

Keep pages focused on composing the screen and its data lifecycle. Put reusable interaction logic in composables or equivalent framework primitives, and reusable presentation in components. Shared contracts should not pull server-only dependencies into the client bundle.

Initialize absent form or selected-record state explicitly, usually with `null`. Distinguish an incomplete draft from a validated submission. Clear modal state on close and reset dependent selections when their owning resource changes.

Each request needs a clear owner. Use cancellation or request generations so a superseded response cannot populate the current screen. Preserve accepted content during a background refresh where appropriate, but clear old-resource content immediately when the identity changes.

## Vue/Nuxt conventions

The portal uses Vue/Nuxt:

- Use Composition API and `<script setup lang="ts">` with standard SFC templates.
- Resolve `MaybeRefOrGetter` inputs with `toValue()` before comparison, Boolean coercion, or URL construction. Test changes after initialization when reactivity is promised.
- Prefer ordinary `ref`/`reactive` updates to writable computed proxies for form state. Use `defineModel` for straightforward child `v-model` contracts when supported by the chosen Vue version.
- Use framework data-fetching primitives consistently and preserve request identity across reactive route changes.
- Verify generated aliases and auto-import behavior through the framework's actual type and build checks.

Use [ui-patterns.md](ui-patterns.md), [required-fields.md](required-fields.md), and [i18n.md](i18n.md) for presentation and form contracts.
