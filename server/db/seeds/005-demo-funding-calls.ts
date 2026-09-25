import type { Kysely } from 'kysely'
import { v7 as uuid } from 'uuid'
import type { Database } from '../schema'

const examples = [
  ['Community facilities renewal', 'Renouvellement des installations communautaires'],
  ['Youth skills and employment', 'Compétences et emploi des jeunes'],
  ['Rural food security', 'Sécurité alimentaire rurale'],
  ['Accessible public spaces', 'Espaces publics accessibles'],
  ['Local climate resilience', 'Résilience climatique locale'],
  ['Digital inclusion projects', 'Projets d’inclusion numérique'],
  ['Community arts partnerships', 'Partenariats artistiques communautaires'],
  ['Volunteer capacity building', 'Renforcement des capacités bénévoles']
] as const

/** Add searchable calls without changing the original demo record or later edits. */
export const demoFundingCallsMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const original = await db
      .selectFrom('funding_call')
      .select(['agencyId', 'streamId', 'surveyId', 'surveyRevision'])
      .orderBy('createdAt', 'asc')
      .executeTakeFirstOrThrow()
    const now = new Date()
    await db
      .insertInto('funding_call')
      .values(
        examples.map(([nameEn, nameFr]) => ({
          id: uuid(),
          agencyId: original.agencyId,
          streamId: original.streamId,
          nameEn,
          nameFr,
          startDate: '2020-01-01',
          endDate: '2099-12-31',
          published: true,
          surveyId: original.surveyId,
          surveyRevision: original.surveyRevision,
          createdAt: now
        }))
      )
      .execute()
  }
}
