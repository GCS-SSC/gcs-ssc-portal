import { applicationMigration } from './application-migration'
import { agreementMigration } from './agreement-migration'
import { surveyMigration } from './survey-migration'
import { governmentMigration } from './government-migration'
import { administratorMigration } from './administrator-migration'
import { organizationStatusMigration } from './organization-status-migration'
import { agreementStatusMigration } from './agreement-status-migration'
import { Migrator, sql } from 'kysely'
import type { Kysely, MigrationResult } from 'kysely'
import type { Database } from './schema'
export const reportMigrationResults = (
  results: readonly MigrationResult[] | undefined,
  label = 'migration'
) => {
  results?.forEach((result) => {
    if (result.status === 'Success')
      console.info(`${label} "${result.migrationName}" was executed successfully`)
    else if (result.status === 'Error')
      console.error(`failed to execute ${label} "${result.migrationName}"`)
  })
}
export const migrate = async (db: Kysely<Database>, target?: string) => {
  const migrator = new Migrator({
    db,
    provider: {
      getMigrations: async () => ({
        '002_government': governmentMigration,
        '003_surveys': surveyMigration,
        '004_agreements': agreementMigration,
        '005_applications_attachments': applicationMigration,
        '006_administrators': administratorMigration,
        '007_organization_status': organizationStatusMigration,
        '008_agreement_status': agreementStatusMigration,
        '001_initial': {
          up: async (connection: Kysely<unknown>) => {
            const statements = `CREATE TABLE "user" (id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false, image text, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL);
CREATE TABLE session (id text PRIMARY KEY, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, token text UNIQUE NOT NULL, "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, "ipAddress" text, "userAgent" text);
CREATE INDEX session_user_idx ON session ("userId");
CREATE TABLE account (id text PRIMARY KEY, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, "accountId" text NOT NULL, "providerId" text NOT NULL, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, UNIQUE ("providerId", "accountId"));
CREATE INDEX account_user_idx ON account ("userId");
CREATE TABLE verification (id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL);
CREATE INDEX verification_identifier_idx ON verification (identifier);
CREATE TABLE organization (id uuid PRIMARY KEY, name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120), description text NOT NULL DEFAULT '', "ownerId" text NOT NULL REFERENCES "user"(id), "createdAt" timestamptz NOT NULL);
CREATE TABLE membership ("organizationId" uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE, "userId" text NOT NULL REFERENCES "user"(id), "joinedAt" timestamptz NOT NULL, PRIMARY KEY ("organizationId", "userId"));
CREATE INDEX membership_user_idx ON membership ("userId");
CREATE TABLE permission ("organizationId" uuid NOT NULL, "userId" text NOT NULL, permission text NOT NULL CHECK (permission = 'admin'), PRIMARY KEY ("organizationId", "userId", permission), FOREIGN KEY ("organizationId", "userId") REFERENCES membership ("organizationId", "userId") ON DELETE CASCADE);
CREATE TABLE invitation (id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE, email text NOT NULL, name text NOT NULL DEFAULT '', "tokenHash" text UNIQUE NOT NULL, status text NOT NULL CHECK (status IN ('pending','accepted','revoked')), "createdBy" text NOT NULL REFERENCES "user"(id), "createdAt" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL);
CREATE INDEX invitation_org_idx ON invitation ("organizationId");`
            for (const statement of statements
              .split(';')
              .map((value) => value.trim())
              .filter(Boolean))
              await sql.raw(statement).execute(connection)
          }
        }
      })
    }
  })
  const result = await (target ? migrator.migrateTo(target) : migrator.migrateToLatest())
  reportMigrationResults(result.results)
  if (result.error) {
    console.error('failed to migrate')
    console.error(result.error)
    throw result.error
  }
}
