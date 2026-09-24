# UI patterns

## Component selection

Follow [GC Design System UI architecture](gcdesign.md) for official components, page structure, navigation semantics, and fallback decisions. Shared `Portal*` components expose the needed native GCDS primitives. A missing adapter must be added, not replaced with a custom lookalike.

## Page composition and recovery

Once a shared page shell exists, reuse its navigation, context, spacing, and responsive behavior. Show meaningful record labels and parent context instead of unexplained database identifiers. Specialized workflows may vary when the interaction requires it.

Provide explicit loading, empty, failure, and retry states. Keep failures understandable and keyboard-operable without exposing raw backend errors. Announce meaningful pending/error state and manage focus after dialogs and recovery. Navigation progress should not unnecessarily unmount the active page.

## Remote tables

Centralize pagination, filters, search, accepted responses, loading, and errors in reusable table state. Reset pagination when filters change, and ignore stale requests. Use the server's total independently from the current page length.

Give columns stable identities. Group row actions consistently and provide accessible names for icon-only controls. Keep selected records and selection behavior explicit across page and filter changes.

## Selects and lookups

Use remote lookup controls for server-owned collections. Hydrate a saved selection's label independently of the current search page so an edit form does not display a raw ID or lose its selected value.

Use local select controls only when the available list is complete and stable for the interaction. Preserve allowed existing selections when a referenced option becomes unavailable, according to the project's explicit business rule. A label lookup must never broaden access or selection authority.

## Forms and read-only evidence

Reuse validation and error-display adapters. Bind field errors to real schema paths, keep user input after a failed submission, and prevent accidental duplicate writes. Follow [required-fields.md](required-fields.md).

When displaying immutable evidence, render the captured snapshot as structured read-only content. Do not silently enrich it with current mutable data. Keep technical integrity metadata secondary to the information the user needs.
