# Architectural baseline

## Current state

No application code, package manifest, database, or runtime has been initialized. The baseline separates presentation, server enforcement, shared contracts, and persistence without prescribing a business domain.

## Boundaries

- The client owns rendering, interaction, and local state. It treats server responses as the authority for accepted writes and access decisions.
- The server owns input validation, authorization, business operations, integrations, and persistence.
- Shared modules contain browser-safe types, schemas, and pure utilities. They must not expose server credentials or depend on server runtime wiring.
- The database enforces structural integrity. Application checks provide useful failures but do not replace constraints and transactions.
- Separately owned packages expose explicit public contracts and own their tests. Introduce packages only when an actual boundary warrants them.

The reference request flow is: client interaction → API validation and access checks → business operation → transactional persistence where needed → explicit response → client state update. Exact ordering must preserve the chosen information-disclosure policy.

## Optional source-stack layout

If this project adopts the source repository's Nuxt/Vue architecture, the following organization can be reused. These paths are proposed, not existing directories.

| Path | Responsibility |
| --- | --- |
| `app/` | Pages, layouts, components, composables, and client utilities |
| `server/api/` | Nitro/H3 HTTP handlers |
| `server/utils/` | Server operations and infrastructure adapters |
| `server/database/` | Ordered migrations and database setup |
| `shared/` | Cross-runtime schemas, types, and pure utilities |
| `tests/` | Application unit, integration, and browser tests |
| `i18n/locales/` | Interface catalogs if localization is required |
| `architecture/` | Architectural decisions and verified contracts |

## Decisions to establish

Record the project's purpose and modules; framework, runtime, package manager and rendering mode; authentication and authorization model; database and identifier/deletion policies; supported locales and multilingual content requirements; integration boundaries; and verification commands. Do not treat a source-project choice as an approved requirement here.
