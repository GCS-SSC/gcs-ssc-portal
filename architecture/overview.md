# System overview

The GCS–SSC organization portal is an independent companion application. It handles accounts, organizations, people, permissions, invitations, government funding administration, applications, cases, claims, forecasts, and standalone forms. It provides its own persisted response workflows and private S3 attachments. The main-system extension remains separate and has not been modified.

## Runtime

The application uses Nuxt 4/Vue 3 with client rendering and same-origin Nitro/H3 endpoints. Bun manages dependencies and tooling; the production artifact runs on Node.js. Better Auth owns email/password authentication and cookie sessions. Zod validates portal inputs. Kysely accesses PostgreSQL when `DATABASE_URL` is configured or a persistent single-process PGlite database otherwise.

The client renders one set of pages through vendor-neutral `Theme*` components. `PORTAL_THEME` selects `themes/nuxtui` or `themes/gcdesign` during build; only the selected theme is registered. New complete theme directories can be selected without changing host pages. See [themes.md](themes.md).

## Boundaries and request flow

A page submits through the same-origin API. The server checks origin and body size for mutations, resolves the Better Auth session, validates input, resolves organization membership/permissions, then performs the operation. Sensitive organization mutations lock the organization and recheck authority in the transaction. Responses contain explicit projections; invitation tokens are returned only when a link is created and stored only as hashes.

Client permission checks control presentation only. The server enforces access independently for every operation. Owner status is separate from additive membership permissions; see [auth.md](auth.md).

Government staff have a separate `/government` entrypoint and authorization model. Root provisions staff; agency-scoped credentials provide the future integration boundary. Published calls reach organization members only through the explicit `application` permission. See [government administration](government.md).

## Source map

| Path               | Responsibility                                                                |
| ------------------ | ----------------------------------------------------------------------------- |
| `app/pages/`       | Registration, login, organization workspace and invitation acceptance         |
| `app/composables/` | Session, API recovery and bilingual messages                                  |
| `app/locales/`     | English/French interface catalogs                                             |
| `themes/`          | Complete build-time presentation adapters and vendor styles                   |
| `tooling/theme.ts` | Theme manifest resolution and contract completeness                           |
| `shared/types/`    | Vendor-neutral component and API contracts                                    |
| `shared/schemas/`  | Strict request schemas                                                        |
| `server/api/`      | Better Auth route and portal HTTP dispatcher                                  |
| `server/utils/`    | Authentication, organization operations, request boundaries and configuration |
| `server/db/`       | Database types, ordered migration and embedded-database transaction leases    |
| `tests/`           | Unit, database integration, theme contract and browser verification           |
| `architecture/`    | Maintained architectural contracts                                            |

## Current limits

There is no email sender, password-recovery service, account deletion, file storage, background job system, or main GCS–SSC integration. Organization invitations are explicitly shared by administrators. Interface language is switchable; theme is not. Organization names/descriptions are user-entered content and do not require two-language variants.
