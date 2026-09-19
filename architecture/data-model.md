# Data model and migrations

The application uses Kysely with PostgreSQL when `DATABASE_URL` is provided. Otherwise it uses embedded PGlite with durable storage at `PGLITE_DATA_DIR` (default `.data/pglite`). The local PGlite dialect serializes connection leases across whole transactions because PGlite has one backend connection. PGlite is intended for one process; use PostgreSQL for multiple application instances. Tests instantiate isolated in-memory PGlite databases using the same schema and PostgreSQL SQL semantics.

`server/db/migrations.ts` contains ordered Kysely migrations. The Nitro close hook destroys the database connection on graceful shutdown, including development worker reloads. Run only one development server against a PGlite directory and stop it before starting a separate preview or process; separate processes cannot coordinate an embedded connection. Restart the server after changing database environment settings. Database initialization awaits migration completion before serving data or auth queries. Migration history and locking use Kysely's migration mechanism. Existing data is never reset at startup. Add a new numbered migration for future changes; do not rewrite released migrations. Recovery uses database backups; destructive down migrations are not provided.

## Tables

- `user`, `account`, `session`, and `verification` implement Better Auth's default schema and column names. Accounts reference users; sessions reference users and have unique tokens.
- `organization` stores server-generated UUIDv7 IDs, display name, description, creator/current owner reference, and creation time. The application generates IDs using `uuid.v7()`; no database ID defaults exist.
- `membership` joins users and organizations, with a composite primary key and join time.
- `permission` holds explicit additive grants; its composite foreign key requires membership. Its current check constraint allows `admin` and `application`; `user` is implicit in membership and cannot be revoked.
- `invitation` holds server-generated UUIDv7 IDs, organization, normalized invited email, optional display name, creator, unique token hash, timestamps, and pending/accepted/revoked state. Expiration is computed from the stored timestamp, so environment changes do not alter existing links.

All portal writes that affect an existing organization lock that organization's row first. Permissions and ownership are reread under the lock. Invitation acceptance uses the same order to serialize against revocation, replacement, and concurrent acceptance. Organization creation atomically creates ownership, membership, and admin. Membership and permission uniqueness are also enforced by database constraints. No public route deletes users or memberships, so the owner's membership remains stable; future deletion functionality must enforce this invariant.

API mappings expose ISO date strings, numeric member counts, and allowlisted fields. Invitation token hashes and auth credentials never appear in these mappings. There is no automatic seeding and no production reset operation. The explicit `bun run db:seed` command applies development-only data migrations using separate `portal_demo_migration` and `portal_demo_migration_lock` tables. It refuses production mode, hashes demo credentials through Better Auth, rejects existing roots/email conflicts, and preserves edits on reruns. Seed data and its history commit atomically; see the README for public demo accounts.

## Government migration

`002_government` preserves existing organizations and extends the permission constraint with `application`. It adds `government_user` (active root/staff grants), `agency_staff` (agency assignments), the agency/program/stream/funding-call hierarchy, hashed government invitations, and hashed integration credentials. A partial unique index permits only one root. All IDs except Better Auth user references are application-generated UUIDv7. Foreign keys enforce the hierarchy, and a database date constraint enforces call end ≥ start. The integration suite upgrades a populated `001_initial` database and checks preserved ownership/grants.

Government mutations lock the actor's current government grant or integration credential before writing. Root staff assignment/status writes lock the target grant, and token revocation locks the credential, so concurrent operations serialize around authorization changes. Root invitation replacement and revocation lock the root grant and then invitation rows; acceptance locks its invitation row. See [government](government.md) for API and publication policy.

## PostgreSQL verification

`bun scripts/test-postgres.ts` provisions a unique disposable PostgreSQL 17 container with loopback-only random port and tmpfs data. It runs the same portal lifecycle, migration rerun, tenant isolation, permission, ownership, expiration, and concurrent acceptance tests as the PGlite lane, then removes only its own container in `finally`. Docker must be available. The helper never uses the application's `DATABASE_URL`.

The underlying suite optionally accepts `PORTAL_TEST_DATABASE_URL`; it rejects a database name without the `_test` suffix and refuses any database with existing public tables before migration. Use a new empty disposable database for every PostgreSQL run. No table reset or database deletion is performed by the suite.

Migration 004 preserves existing data while upgrading legacy application grants to viewer and adding case, submission-set and response tables. Composite keys enforce agency ancestry and organization ownership. Financial decimals and foreign bigint identifiers stay strings in JSON. See [cases](cases.md) for publication snapshots, reconciliation timestamps and immutable exports.

Browser-created survey questions/options/structure and case configuration keys use 24 alphanumeric Nano ID characters (approximately 143 random bits), optionally prefixed by their content kind. This works during HTTP LAN development without `crypto.randomUUID`. Existing keys remain valid and are never rewritten. Portal database entities, including organizations, continue to use server-generated UUIDv7.
