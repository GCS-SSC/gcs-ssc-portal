import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema'

const instructions = [
  {
    agreementNumber: 'DEMO-001',
    en: 'Forecast eligible food and delivery costs for each month of the fiscal year. Enter zero for months without planned spending.',
    fr: 'Prévoyez les coûts admissibles des aliments et de la livraison pour chaque mois de l’exercice. Inscrivez zéro pour les mois sans dépenses prévues.'
  },
  {
    agreementNumber: 'DEMO-002',
    en: 'Forecast training and equipment costs by month using the budget lines in this agreement. Enter zero where no spending is planned.',
    fr: 'Prévoyez les coûts de formation et d’équipement par mois à l’aide des postes budgétaires de cette entente. Inscrivez zéro lorsqu’aucune dépense n’est prévue.'
  },
  {
    agreementNumber: 'DEMO-003',
    en: 'Forecast project costs by month for each approved budget line. Update future months as plans change and enter zero for months without planned spending.',
    fr: 'Prévoyez les coûts du projet par mois pour chaque poste budgétaire approuvé. Mettez à jour les mois à venir selon l’évolution des plans et inscrivez zéro pour les mois sans dépenses prévues.'
  }
] as const

/** Give demo forecasts illustrative instructions without rewriting submitted records. */
export const demoForecastInstructionsMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    for (const { agreementNumber, en, fr } of instructions) {
      const agreement = await db
        .selectFrom('funding_agreement')
        .select(['id', 'config'])
        .where('sourceSystem', '=', 'demo')
        .where('agreementNumber', '=', agreementNumber)
        .executeTakeFirst()
      if (!agreement || agreement.config.forecastInstruction) continue
      const instruction = JSON.stringify({ en, fr })
      await db
        .updateTable('funding_agreement')
        .set({
          config: sql`jsonb_set(config, '{forecastInstruction}', ${instruction}::jsonb, true)`
        })
        .where('id', '=', agreement.id)
        .execute()
      await db
        .updateTable('submission_set')
        .set({
          snapshot: sql`jsonb_set(snapshot, '{agreement,config,forecastInstruction}', ${instruction}::jsonb, true)`
        })
        .where('agreementId', '=', agreement.id)
        .where('published', '=', true)
        .where(sql<boolean>`items @> '[{"kind":"forecast"}]'::jsonb`)
        .execute()
      await db
        .updateTable('set_response')
        .set({
          snapshot: sql`jsonb_set(snapshot, '{agreement,config,forecastInstruction}', ${instruction}::jsonb, true)`
        })
        .where('status', '=', 'draft')
        .where(sql<boolean>`snapshot->'agreement'->>'id' = ${String(agreement.id)}`)
        .where(sql<boolean>`items @> '[{"kind":"forecast"}]'::jsonb`)
        .execute()
    }
  }
}
