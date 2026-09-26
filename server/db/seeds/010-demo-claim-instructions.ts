import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema'

const instructions = [
  {
    agreementNumber: 'DEMO-001',
    en: 'Report eligible food and delivery costs for the selected fiscal months. Include the purchase date and receipt reference in each description.',
    fr: 'Déclarez les coûts admissibles des aliments et de la livraison pour les mois choisis. Indiquez la date d’achat et la référence du reçu dans chaque description.'
  },
  {
    agreementNumber: 'DEMO-002',
    en: 'Enter training and equipment expenses separately. Describe the session or equipment purchase and retain the supporting invoices.',
    fr: 'Saisissez séparément les dépenses de formation et d’équipement. Décrivez la séance ou l’achat et conservez les factures justificatives.'
  },
  {
    agreementNumber: 'DEMO-003',
    en: 'Claim work completed during the selected period. Identify the location and activity in each description and keep contractor records available.',
    fr: 'Réclamez les travaux terminés pendant la période choisie. Précisez le lieu et l’activité dans chaque description et conservez les dossiers des entrepreneurs.'
  }
] as const

/** Add illustrative agreement instructions to demo agreements and their active draft snapshots. */
export const demoClaimInstructionsMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    for (const { agreementNumber, en, fr } of instructions) {
      const agreement = await db
        .selectFrom('funding_agreement')
        .select(['id', 'config'])
        .where('sourceSystem', '=', 'demo')
        .where('agreementNumber', '=', agreementNumber)
        .executeTakeFirst()
      if (!agreement || agreement.config.claimInstruction) continue
      const instruction = JSON.stringify({ en, fr })
      await db
        .updateTable('funding_agreement')
        .set({
          config: sql`jsonb_set(config, '{claimInstruction}', ${instruction}::jsonb, true)`
        })
        .where('id', '=', agreement.id)
        .execute()
      await db
        .updateTable('submission_set')
        .set({
          snapshot: sql`jsonb_set(snapshot, '{agreement,config,claimInstruction}', ${instruction}::jsonb, true)`
        })
        .where('agreementId', '=', agreement.id)
        .where('published', '=', true)
        .where(sql<boolean>`items @> '[{"kind":"claim"}]'::jsonb`)
        .execute()
      await db
        .updateTable('set_response')
        .set({
          snapshot: sql`jsonb_set(snapshot, '{agreement,config,claimInstruction}', ${instruction}::jsonb, true)`
        })
        .where('status', '=', 'draft')
        .where(sql<boolean>`snapshot->'agreement'->>'id' = ${String(agreement.id)}`)
        .where(sql<boolean>`items @> '[{"kind":"claim"}]'::jsonb`)
        .execute()
    }
  }
}
