# GCS–SSC organization portal

A companion portal for registering organizations, managing their people, and administering government funding opportunities. The application has one set of pages and two interchangeable **build-time** themes: Nuxt UI and GC Design System. English and French interfaces are included.

## Run locally

Requirements: Node.js 22.12 or later and Bun 1.3.13 or later.

```sh
bun install --frozen-lockfile
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env to a value from: openssl rand -base64 32
bun run dev
```

Open `http://localhost:3000`. Keep `APP_URL` equal to the browser origin; authenticated writes reject other origins. Nuxt loads `.env` in development. PGlite stores local data in `.data/pglite`; no database setup or seeded accounts are required. Register an account to begin.

PGlite requires one server process per data directory. Stop the old process before starting another. Use PostgreSQL for multi-process operation and active backend hot-reload work. Do not share a PGlite directory between development, previews, or test runs.

## Demo seed data

Stop the development server first when using PGlite, then run:

```sh
bun run db:seed
bun run dev --host 0.0.0.0
```

Bun reads your local `.env`. The seed uses `DATABASE_URL` for PostgreSQL, or `PGLITE_DATA_DIR` (default `.data/pglite`) otherwise. Keep `APP_URL` set to the exact browser origin as described above.

All demo accounts use **`Portal-demo-only-2026!`**. These are public development credentials; use this command only against a development/demo database. The command refuses `NODE_ENV=production`.

| Email | Access | Sign-in page |
| --- | --- | --- |
| `root@demo.example.test` | Government root; manages staff and integration credentials | `/government/login` |
| `staff@demo.example.test` | Government staff assigned to Demo Funding Agency | `/government/login` |
| `owner@demo.example.test` | Organization owner/admin; manager for applications, claims, forecasts and standalone forms | `/login` |
| `contributor@demo.example.test` | Organization contributor for all four subjects; edits drafts | `/login` |
| `viewer@demo.example.test` | Organization viewer for all four subjects; read-only | `/login` |
| `user@demo.example.test` | Organization member with base user access only | `/login` |

The migration also creates **Demo Community Organization**, a bilingual agency/program/stream hierarchy, a three-question bilingual application form, and a published **Demo community funding call** open through 2099. Attachments are disabled on this sample form so it works without S3. Staff can enable them in a new form revision after configuring storage, and create cases, budgets, claims/forecasts and additional forms through the government workspace.

Try the flow: sign in as the contributor, open the organization and **Apply for funding**, start the demo application, answer the questions and save. Sign in as the owner in another browser session to review and submit the shared draft. Sign in as staff, open the demo agency's **Cases and submissions**, and review the received application. The viewer can read; the base user cannot access funding. Owners can create further invitation links through the organization's invitations screen; the seed does not manufacture invitation tokens or send email.

This is an explicit, transactional data migration with its own `portal_demo_migration` history. Normal schema migrations and app startup never seed accounts. Repeated runs are no-ops: they preserve edited demo data, changed passwords and submissions. Existing email conflicts or an existing government root abort the first seed and roll back its data instead of modifying existing identities. To try it alongside an existing root, use a separate database, for example `PGLITE_DATA_DIR=.data/demo bun run db:seed`, then run the app with that same directory. Do not remove migration history to rerun it; use a fresh demo database. Future seed changes belong in new numbered migrations.

## Build and run

```sh
bun run build:nuxtui
# or
bun run build:gcdesign
```

Both write `.output/`, so run builds sequentially. Start the result with `bun run preview` after providing runtime environment variables. A production Node process does not automatically read `.env`; inject its variables or use `node --env-file=.env.production .output/server/index.mjs` with a production configuration.

Production requires an explicit HTTPS `APP_URL`, a random `BETTER_AUTH_SECRET` of at least 32 characters, and persistent database storage. Set `DATABASE_URL` for PostgreSQL; otherwise mount `PGLITE_DATA_DIR` on durable storage and run only one instance. Ordered migrations run before database-dependent requests are served. There is no email delivery service or connection to the main GCS–SSC application's APIs yet.

`PORTAL_THEME` is consumed by the build. Changing it on the running server, in a cookie, or through the UI cannot switch the theme. The language toggle only changes language.

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

## Government administration

Government staff sign in at `/government/login`. A root administrator invites staff; organization permissions cannot grant government access. Active staff set up their agencies, programs, streams, and bilingual calls for proposals. Calls start as drafts and become visible only after publication, to organization members with the explicit `application` permission.

To bootstrap the root, stop the local PGlite server, supply `ROOT_NAME`, `ROOT_EMAIL`, and `ROOT_PASSWORD` securely in the process environment, and run `bun run root:create`. It creates one fresh account and refuses an existing root or email. Restart the app afterward. Use the same database configuration as the app; PostgreSQL does not need the server stopped.

Root can also issue expiring, agency-scoped credentials for the future GCS–SSC extension. The UI and API both support maintaining the funding hierarchy. See [government administration and the API contract](architecture/government.md) for setup, access rules, endpoints and integration examples. Application drafts and manager submission are described in [applications](architecture/applications.md).

## Shared survey provider

The portal uses [`@gcs-ssc/survey`](https://github.com/GCS-SSC/survey), pinned to a Git revision in `package.json`. The public package owns the survey JSON contract, validation, and unstyled Vue behavior; this app supplies its designer and preview using the active theme. No changes have been made to the GCS–SSC sibling app.

Open **Application forms** in an agency to design bilingual text, email, number, date and single-choice questions. Save a form revision and attach it to a draft call. Imports use the same model through the agency-scoped API. Published calls retain their selected revision until explicitly changed. Application viewers can preview forms and read responses. Contributors start and edit saved drafts; managers review and submit. Preview answers remain separate from saved drafts.

See [the survey architecture and API](architecture/surveys.md) for integration details.

## Add a theme

See [the theme contract](architecture/themes.md). Drop a directory into `themes/`, implement the nine `Theme*` components, and add its `theme.json`. Then build with:

```sh
PORTAL_THEME=my-theme bun run build
```

Host pages use only the shared adapters. Theme manifests register the selected theme's components, styles, plugins, and vendor modules. Third-party theme code runs as trusted application code and should be reviewed like any dependency.

## Verification

```sh
bun run lint
bun run typecheck
bun run test:unit
bun run test:postgres # requires Docker
bunx playwright install chromium
bun run test:themes
```

`test:themes` builds and browser-tests each theme sequentially. Each browser run starts its own production artifact over local HTTPS with an ephemeral certificate, secure cookies, and a disposable PGlite directory. OpenSSL generates the test certificate. Docker runs a disposable MinIO bucket for real S3 attachment verification. It never uses `DATABASE_URL` or an existing application database. `test:e2e` builds the current selected theme first; `bunx playwright test` runs an already-built artifact for focused debugging.

`test:postgres` creates an isolated PostgreSQL 17 container, runs the lifecycle/concurrency suite, then removes only that container.

The tests cover server authorization, UUIDv7 creation, ownership, permission isolation, invitation expiry/reuse/revocation, concurrent acceptance, request limits, theme contracts, translations, and browser registration/team workflows. See [architecture](architecture/README.md) for implementation boundaries.

## Design sources

The GC theme uses the official [GC Design System Vue components](https://github.com/cds-snc/gcds-components/tree/main/packages/vue). Its layout follows the [GC basic page template](https://design-system.canada.ca/en/page-templates/basic/). The Nuxt UI theme uses [Nuxt UI](https://ui.nuxt.com/) controls with a similar government service layout. Official signature assets retain their source attribution in the theme directory. GC vendor styles reference external fonts; system-font fallbacks keep content usable when those hosts are unavailable.

Government staff can configure cases, budget lines and ordered sets of designed forms, claims and forecasts. Organizations use subject-specific viewer/contributor/manager permissions; managers review current balances and can submit with acknowledged warnings. See [case workflows and integration contracts](architecture/cases.md).

See [private attachments](architecture/attachments.md) for app-wide S3 configuration, per-form opt-in and download/cleanup contracts.

See the [user workflow guide](docs/using-the-portal.md) and [completion plan](architecture/completion-plan.md) for the release scope and operational handoff.

For LAN development, set `APP_URL` in your local `.env` to the exact browser address (for example, `http://192.168.1.10:3000`), then run `bun run dev --host 0.0.0.0`. Restart after changing it. Listening on all interfaces does not authorize every website origin: the default remains `http://localhost:3000`, and a mismatched address rejects registration and other writes. Never disable origin checks to resolve this.
