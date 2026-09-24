# GCS–SSC organization portal

A companion portal for registering organizations, managing their people, and receiving agency funding configuration from a future GCS–SSC extension. The application has one UI built with GC Design System. English and French interfaces are included.

## Run locally

Requirements: Node.js 22.12 or later and Bun 1.3.13 or later.

```sh
bun install --frozen-lockfile
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env to a value from: openssl rand -base64 32
bun run dev
```

Open `http://localhost:3000`. The development wrapper derives the Better Auth base URL and trusted origins from Nuxt's `--host` and `--port` arguments. With `--host 0.0.0.0`, loopback and active LAN interface origins are accepted. The server also accepts a browser request from its own origin in development, including an HTTPS forwarding URL, without another environment setting. Nuxt loads `.env` in development. PGlite stores local data in `.data/pglite`; ordered schema and demo seed migrations run automatically during server startup. Every newly applied schema and demo migration is logged individually in the server output. No separate database setup is required.

To remove the default local PGlite database before starting, pass `--clean`. All other arguments are forwarded to Nuxt, so this matches the main GCS–SSC development workflow:

```sh
bun run dev --clean --port 3002 -o
# Equivalent convenience command:
bun run dev:clean --port 3002 -o
```

`--clean` removes only `.data/pglite`. It does not delete a custom `PGLITE_DATA_DIR` or a PostgreSQL database selected with `DATABASE_URL`.

PGlite requires one server process per data directory. Stop the old process before starting another. Use PostgreSQL for multi-process operation and active backend hot-reload work. Do not share a PGlite directory between development, previews, or test runs.

## Demo seed data

The development wrapper applies pending demo seed migrations automatically. To apply them manually for a custom database, stop the development server when using PGlite, then run:

```sh
bun run db:seed
bun run dev --host 0.0.0.0
```

Bun reads your local `.env`. The seed uses `DATABASE_URL` for PostgreSQL, or `PGLITE_DATA_DIR` (default `.data/pglite`) otherwise. Production requires `APP_URL` to be the exact browser origin.

The demo seed creates one organization owned by `owner@portal.com` with contributor, viewer, and member accounts. It also creates three sample funding agreements, each with a published claims and forecasts set, plus an open funding call with a bilingual application form. Pending seed migrations add missing demo fixtures on restart without resetting an existing demo database or overwriting edited records.

All demo accounts use **`password123`**. These are public development credentials; use this command only against a development/demo database. The command refuses `NODE_ENV=production` unless `PORTAL_ENVIRONMENT=demo` explicitly opts into a demo deployment.

| Email                    | Access                                                                                     | Sign-in page   |
| ------------------------ | ------------------------------------------------------------------------------------------ | -------------- |
| `admin@portal.com`       | System administrator; registers agencies and issues integration keys                       | `/admin/login` |
| `owner@portal.com`       | Organization owner/admin; manager for applications, claims, forecasts and standalone forms | `/login`       |
| `contributor@portal.com` | Organization contributor for all four subjects; edits drafts                               | `/login`       |
| `viewer@portal.com`      | Organization viewer for all four subjects; read-only                                       | `/login`       |
| `user@portal.com`        | Organization member with base user access only                                             | `/login`       |

The migration also creates **Demo Community Organization**, a bilingual agency/program/stream hierarchy, a three-question bilingual application form, and a published **Demo community funding call** open through 2099. Attachments are disabled on this sample form so it works without S3. The future extension can update forms and configure cases, budgets, claims, forecasts and additional forms through the agency API.

Try the flow: sign in as the contributor, open the organization and **Apply for funding**, start the demo application, answer the questions and save. Sign in as the owner in another browser session to review and submit the shared draft. The future extension can retrieve submitted applications with its agency key. The viewer can read; the base user cannot access funding. Owners can create further invitation links through the organization's invitations screen; the seed does not manufacture invitation tokens or send email.

This is an explicit, transactional data migration with its own `portal_demo_migration` history. `bun run dev` and demo container startup apply pending seed migrations; repeated runs are no-ops after all seed migrations have applied. Seed migration `002_simple_credentials` upgrades the original demo addresses and passwords. Migration `003_administrator` creates the separate administrator and removes untouched legacy root/staff demo fixtures while preserving organization and funding data. Existing email conflicts abort the first seed and roll back its data instead of modifying existing identities. To try it against a separate database, use `PGLITE_DATA_DIR=.data/demo bun run dev`. Do not remove migration history to rerun it; use a fresh demo database. Future seed changes belong in new numbered migrations.

## Container images and Railway

GitHub Actions builds and tests one GC Design System demo image, publishes it to a private GHCR package, and produces a digest artifact. Railway uses the pinned digest in `deployment/demo-images.json`; it never builds from source or follows a mutable tag. Demo images migrate and seed before listening, preserving data on restart. See [the Railway/image runbook](docs/deployment-railway.md) for release promotion, credentials and IaC setup. Committing this setup does not deploy to Railway.

## Build and run

```sh
bun run build
```

The build writes `.output/`. Start the result with `bun run preview` after providing runtime environment variables. A production Node process does not automatically read `.env`; inject its variables or use `node --env-file=.env.production .output/server/index.mjs` with a production configuration.

Production requires an explicit HTTPS `APP_URL`, a random `BETTER_AUTH_SECRET` of at least 32 characters, and persistent database storage. Set `DATABASE_URL` for PostgreSQL; otherwise mount `PGLITE_DATA_DIR` on durable storage and run only one instance. Ordered migrations run before database-dependent requests are served. There is no email delivery service or connection to the main GCS–SSC application's APIs yet.

## Organizations and permissions

- Registration creates an account. An account can create or join multiple organizations.
- Organization IDs are UUIDv7 values generated by the server application.
- Creating an organization atomically creates its first membership, grants `admin`, and makes the creator its sole owner.
- Membership grants `user`. Additional permissions are stored directly against the user and organization; there are no assignable role records.
- Administrators edit organization details, generate/revoke invitations, and grant/remove `admin` and application/claim/forecast/form viewer, contributor or manager access. All current members can see their organization's people.
- Only the owner can transfer ownership to an existing member. The new owner gains `admin`; the former owner retains it. The owner's administrator permission cannot be removed.
- An invitation is bound to an email, expires after `INVITATION_EXPIRY_DAYS` (default 7), and can be accepted once. A replacement invitation revokes older pending links for that address in that organization.
- Administrators copy and share the generated link themselves. The recipient creates an account or signs in, then explicitly accepts. Invited members start with `user` only. A manually shared invitation does not verify ownership of an email inbox.

Owner status and permissions are organization-specific. Owning or administering one organization never grants access to another.

## System administration and integration

Administrators sign in at `/admin/login`. Their credentials and sessions are stored separately from organization accounts, so neither identity can enter the other portal. The demo seed creates `admin@portal.com`; several administrators may exist. The administrator UI registers agencies and issues or revokes agency-scoped keys. For a non-demo database, create an administrator with `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `bun run admin:create`; first-launch provisioning is planned.

The future GCS–SSC extension uses a key to push programs, streams, calls, forms, cases and sets through `/api/government`. That API accepts bearer keys only. Existing organization responses and published funding remain available in the companion app. See [administrator access and the API contract](architecture/government.md).

## Shared survey provider

The portal uses [`@gcs-ssc/survey`](https://github.com/GCS-SSC/survey), pinned to a Git revision in `package.json`. The public package owns the survey JSON contract, validation, and unstyled Vue behavior; this app supplies organization previews using GC Design System. No changes have been made to the GCS–SSC sibling app.

The extension can import bilingual text, email, number, date and single-choice questions, save form revisions, and attach them to draft calls through the agency-scoped API. Published calls retain their selected revision until explicitly changed. Application viewers can preview forms and read responses. Contributors start and edit saved drafts; managers review and submit. Preview answers remain separate from saved drafts.

See [the survey architecture and API](architecture/surveys.md) for integration details.

## UI components

GC Design System is the only UI. See [UI integration](architecture/ui-components.md) and [component policy](architecture/gcdesign.md). Shared `Portal*` components in `app/components/ui/` adapt official GCDS controls to Vue, forms, and localization.

## Verification

```sh
bun run lint
bun run typecheck
bun run test:unit
bun run test:postgres # requires Docker
bunx playwright install chromium
bun run test:e2e
```

Each browser run starts its own production artifact over local HTTPS with an ephemeral certificate, secure cookies, and a disposable PGlite directory. OpenSSL generates the test certificate. Docker runs a disposable MinIO bucket for real S3 attachment verification. It never uses `DATABASE_URL` or an existing application database. `test:e2e` builds the application first; `bunx playwright test` runs an already-built artifact for focused debugging.

`test:postgres` creates an isolated PostgreSQL 17 container, runs the lifecycle/concurrency suite, then removes only that container.

The tests cover server authorization, UUIDv7 creation, ownership, permission isolation, invitation expiry/reuse/revocation, concurrent acceptance, request limits, UI integration contracts, translations, and browser registration/team workflows. See [architecture](architecture/README.md) for implementation boundaries.

## Design sources

The application uses the official [GC Design System Vue components](https://github.com/cds-snc/gcds-components/tree/main/packages/vue). See [GC Design System architecture](architecture/gcdesign.md) for component selection, sizing, and layout policy. Vendor styles reference external fonts; system-font fallbacks keep content usable when those hosts are unavailable.

Agency-scoped extension keys can configure cases, budget lines and ordered sets of designed forms, claims and forecasts. Organizations use subject-specific viewer/contributor/manager permissions; managers review current balances and can submit with acknowledged warnings. See [case workflows and integration contracts](architecture/cases.md).

See [private attachments](architecture/attachments.md) for app-wide S3 configuration, per-form opt-in and download/cleanup contracts.

See the [user workflow guide](docs/using-the-portal.md) and [completion plan](architecture/completion-plan.md) for the release scope and operational handoff.

For a forwarded development address such as `https://3002.example.dev`, run `bun run dev --host 0.0.0.0 --port 3002` and open that address. Production still requires an explicit HTTPS `APP_URL`. Mutation requests from a different website origin are rejected.
