import { hashPassword } from 'better-auth/crypto'
import { sql, type Kysely } from 'kysely'
import { v7 as uuid } from 'uuid'
import type { SurveyDefinition } from '@gcs-ssc/survey'
import type { Database } from '../schema'

export const demoPassword = 'password123'
export const demoAccounts = ['root', 'staff', 'owner', 'contributor', 'viewer', 'user'] as const

export const demoMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    // Never adopt an existing identity or replace a root/password with a public demo credential.
    if (
      await db
        .selectFrom('government_user')
        .select('userId')
        .where('role', '=', 'root')
        .executeTakeFirst()
    )
      throw new Error(
        'Demo seed requires a database without an existing root. Use a separate demo database.'
      )
    const now = new Date()
    const ids = Object.fromEntries(demoAccounts.map((name) => [name, uuid()])) as Record<
      (typeof demoAccounts)[number],
      string
    >
    for (const name of demoAccounts) {
      const id = ids[name]
      await db
        .insertInto('user')
        .values({
          id,
          name: `Demo ${name}`,
          email: `${name}@portal.com`,
          emailVerified: true,
          image: null,
          createdAt: now,
          updatedAt: now
        })
        .execute()
      await db
        .insertInto('account')
        .values({
          id: uuid(),
          userId: id,
          accountId: id,
          providerId: 'credential',
          password: await hashPassword(demoPassword),
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
          createdAt: now,
          updatedAt: now
        })
        .execute()
    }
    await db
      .insertInto('government_user')
      .values([
        { userId: ids.root, role: 'root', active: true, createdAt: now },
        { userId: ids.staff, role: 'staff', active: true, createdAt: now }
      ])
      .execute()
    const organizationId = uuid(),
      agencyId = uuid(),
      programId = uuid(),
      streamId = uuid(),
      surveyId = uuid()
    await db
      .insertInto('organization')
      .values({
        id: organizationId,
        name: 'Demo Community Organization',
        description: 'Development sample organization / Organisme de démonstration',
        ownerId: ids.owner,
        createdAt: now
      })
      .execute()
    for (const name of ['owner', 'contributor', 'viewer', 'user'] as const) {
      await db
        .insertInto('membership')
        .values({ organizationId, userId: ids[name], joinedAt: now })
        .execute()
      if (name === 'owner')
        await db
          .insertInto('permission')
          .values({ organizationId, userId: ids[name], permission: 'admin' })
          .execute()
      if (name !== 'user') {
        const level = name === 'owner' ? 'manager' : name
        for (const subject of ['application', 'claim', 'forecast', 'form'] as const)
          await db
            .insertInto('permission')
            .values({ organizationId, userId: ids[name], permission: `${subject}:${level}` })
            .execute()
      }
    }
    await db
      .insertInto('agency')
      .values({
        id: agencyId,
        nameEn: 'Demo Funding Agency',
        nameFr: 'Organisme de financement de démonstration',
        createdAt: now
      })
      .execute()
    await db.insertInto('agency_staff').values({ agencyId, userId: ids.staff }).execute()
    await db
      .insertInto('program')
      .values({
        id: programId,
        agencyId,
        nameEn: 'Community Development',
        nameFr: 'Développement communautaire',
        createdAt: now
      })
      .execute()
    await db
      .insertInto('stream')
      .values({
        id: streamId,
        programId,
        agencyId,
        nameEn: 'Community Projects',
        nameFr: 'Projets communautaires',
        createdAt: now
      })
      .execute()
    const definition: SurveyDefinition = {
      schemaVersion: 1,
      title: { en: 'Community project application', fr: 'Demande de projet communautaire' },
      attachments: { enabled: false },
      questions: [
        {
          id: 'project_name',
          type: 'text',
          maxLength: 2000,
          label: { en: 'Project name', fr: 'Nom du projet' },
          required: true
        },
        {
          id: 'project_summary',
          type: 'text',
          maxLength: 2000,
          label: { en: 'Project summary', fr: 'Résumé du projet' },
          required: true
        },
        {
          id: 'participants',
          type: 'number',
          label: { en: 'Expected participants', fr: 'Nombre de participants prévu' },
          required: true
        }
      ]
    }
    await db
      .insertInto('survey')
      .values({ id: surveyId, agencyId, revision: 1, updatedAt: now })
      .execute()
    await db
      .insertInto('survey_revision')
      .values({
        surveyId,
        revision: 1,
        definition: sql`${JSON.stringify(definition)}::jsonb`,
        createdAt: now
      })
      .execute()
    await db
      .insertInto('funding_call')
      .values({
        id: uuid(),
        agencyId,
        streamId,
        nameEn: 'Demo community funding call',
        nameFr: 'Appel de financement communautaire de démonstration',
        startDate: '2020-01-01',
        endDate: '2099-12-31',
        published: true,
        surveyId,
        surveyRevision: 1,
        createdAt: now
      })
      .execute()
  }
}
