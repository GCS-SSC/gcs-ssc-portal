# Agent guide

This is the GCS–SSC companion organization portal. It owns its accounts, organizations, invitations, organization-scoped permissions, and a separate government funding administration area. Read [government access](architecture/government.md) before changing staff grants, agency scoping or call publication. The main GCS–SSC application remains a separate system.

## Before working

- Read [architecture/README.md](architecture/README.md) and the documents relevant to the task. Inspect nearby implementation and tests once they exist.
- Source code, configuration, migrations, and executable tests are authoritative when documentation differs. Update documentation when changing an architectural boundary or contract.
- Treat graphs, generated summaries, and static-analysis findings as navigation aids. Trace the executable path before reporting or fixing a defect.
- Preserve unrelated work. Do not delete code merely because a tool reports it unused. Do not commit unless asked.

## Repository and tooling

- `AGENTS.md` and `architecture/` are maintained directly in this repository. No private tooling checkout, submodule, compatibility symlink, or sibling-specific skill is required.
- Stack: Bun, Nuxt 4/Vue 3, Better Auth, Kysely, PostgreSQL or single-process PGlite, and Zod. Read `package.json` for commands.
- For UI work, read [GC Design System UI architecture](architecture/gcdesign.md). Reuse official GCDS components through the shared GCDS integration components, including layout and typography; do not recreate available components with custom HTML/CSS. Document genuine capability gaps.
- Run `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:e2e` for relevant implementation changes. Browser tests build the GC Design System application; never rebuild `.output` while another verification server owns it.
- Keep dependencies, build outputs, caches, generated reports, local databases, and secrets out of authored source. Change generators rather than their generated outputs.
- Keep tests with the application or package that owns the behavior. Shared integration tests should verify public boundaries rather than another package's implementation details.

## Engineering conventions

- Prefer small typed functions and composable modules. Reuse established helpers before introducing variants; add abstraction when it removes real duplication or clarifies a boundary.
- For TypeScript, use `import type`, avoid name shadowing, and prefer arrow functions. Use named options or discriminated modes for multi-case policy instead of unexplained Boolean arguments.
- Keep browser-safe shared contracts separate from server-only database, authentication, and secret-handling code.
- Keep routes focused on request orchestration where reusable business helpers exist. Do not introduce a controller/service/repository hierarchy solely for stylistic uniformity.
- Respect configured runtime and compilation targets. Framework-specific conventions in the architecture documents apply only if that framework is adopted.

## Security and data

- Enforce access on the server. Client navigation and hidden controls are presentation, never authorization.
- Define resource ownership, actions, scopes, and public exceptions explicitly. Do not infer permissions from route nesting, foreign keys, or the source project's role model.
- Validate all untrusted inputs. Keep validation, API transport, client hydration, and error handling consistent; verify both the route boundary and a real caller for contract changes.
- Use transactions for coupled writes and deliberate lock ordering for concurrency-sensitive operations. Recheck mutable authorization and state inside sensitive write transactions.
- Preserve supported persisted data. Upgrade an existing schema with ordered incremental migrations; never require a reset as an incidental consequence of a feature change.
- Choose this project's naming, identifiers, deletion policy, and audit ownership deliberately. Do not inherit domain prefixes or table conventions from the sibling project.

## UI and localization

- Reuse established page shells, controls, and composables when they exist. Preserve loading, empty, error, retry, and keyboard interaction behavior.
- Reset identity-dependent state when a route or selected resource changes, and prevent stale responses from overwriting the new state.
- For every added or changed form field, follow [architecture/required-fields.md](architecture/required-fields.md): validation, visible required identification, and accessibility semantics must agree.
- If localization is enabled, keep interface messages in catalogs with matching keys and placeholders across supported locales. Keep persisted multilingual content distinct from interface translations.

## Verification and delivery

- Match verification to risk: unit tests for pure rules, database integration tests for constraints and concurrency, and browser tests for important user journeys and rendered accessibility behavior.
- Run the relevant configured lint, type, test, and build checks. Report skipped or unavailable checks and why; do not claim a script or gate exists before it is implemented.
- Preserve configured coverage thresholds and meaningful assertions. Avoid tests that merely mirror implementation.
- Review the resulting change for caller compatibility, persisted data, authorization, accessibility, and unintended scope expansion. Review findings are leads, not proof that a proposed fix is correct.
- Keep review-only work read-only unless fixes are requested. Invoke CodeRabbit only when explicitly requested.
- Report what changed, how it was verified, and any remaining limitations.
