import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import type { Database } from '../schema'

/** Exercise agency grouping in the applicant's searchable demo catalogue. */
export const demoSecondAgencyMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const original = await db
      .selectFrom('funding_call')
      .select(['surveyId', 'surveyRevision'])
      .orderBy('createdAt', 'asc')
      .executeTakeFirstOrThrow()
    if (!original.surveyId || !original.surveyRevision)
      throw new Error('The demo application form is missing')
    const originalRevision = await db
      .selectFrom('survey_revision')
      .select('definition')
      .where('surveyId', '=', original.surveyId)
      .where('revision', '=', original.surveyRevision)
      .executeTakeFirstOrThrow()
    const now = new Date()
    const agency = await db
      .insertInto('agency')
      .values({
        nameEn: 'Demo Regional Agency',
        nameFr: 'Agence régionale de démonstration',
        createdAt: now
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    const agencyId = agency.id
    const program = await db
      .insertInto('program')
      .values({
        agencyId,
        nameEn: 'Regional Partnerships',
        nameFr: 'Partenariats régionaux',
        createdAt: now
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    const programId = program.id
    const stream = await db
      .insertInto('stream')
      .values({
        programId,
        agencyId,
        nameEn: 'Community Infrastructure',
        nameFr: 'Infrastructure communautaire',
        createdAt: now
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    const streamId = stream.id
    const survey = await db
      .insertInto('survey')
      .values({ agencyId, revision: 1, updatedAt: now })
      .returning('id')
      .executeTakeFirstOrThrow()
    const surveyId = survey.id
    await db
      .insertInto('survey_revision')
      .values({
        surveyId,
        revision: 1,
        definition: sql`${JSON.stringify(originalRevision.definition)}::jsonb`,
        createdAt: now
      })
      .execute()
    await db
      .insertInto('funding_call')
      .values(
        [
          ['Regional transit access', 'Accès au transport régional'],
          ['Community hub improvements', 'Amélioration des carrefours communautaires'],
          ['Public library modernization', 'Modernisation des bibliothèques publiques']
        ].map(([nameEn, nameFr]) => ({
          agencyId,
          streamId,
          nameEn: nameEn!,
          nameFr: nameFr!,
          startDate: '2020-01-01',
          endDate: '2099-12-31',
          published: true,
          surveyId,
          surveyRevision: 1,
          createdAt: now
        }))
      )
      .execute()
  }
}
