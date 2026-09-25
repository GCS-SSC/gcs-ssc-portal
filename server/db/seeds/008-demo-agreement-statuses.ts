import { sql, type Kysely } from 'kysely'
import { agreementStatusSchema, type AgreementStatus } from '../../../shared/schemas/agreements'
import type { Database } from '../schema'

const examples = [
  {
    agreementNumber: 'DEMO-001',
    nameEn: 'Community Food Access Agreement',
    status: { en: 'In progress', fr: 'En cours', colour: '#245A80' }
  },
  {
    agreementNumber: 'DEMO-002',
    nameEn: 'Digital Skills Training Agreement',
    status: { en: 'Under review', fr: 'À l’étude', colour: '#795600' }
  },
  {
    agreementNumber: 'DEMO-003',
    nameEn: 'Neighbourhood Green Spaces Agreement',
    status: { en: 'Completed', fr: 'Terminée', colour: '#286A46' }
  }
] as const

/** Add varied tags to untouched demo agreements without changing later edits. */
export const demoAgreementStatusesMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    for (const example of examples) {
      const status = agreementStatusSchema.parse(example.status)
      await db
        .updateTable('funding_agreement')
        .set({ status: sql<AgreementStatus>`${JSON.stringify(status)}::jsonb` })
        .where('sourceSystem', '=', 'demo')
        .where('agreementNumber', '=', example.agreementNumber)
        .where('nameEn', '=', example.nameEn)
        .where('revision', '=', 1)
        .where('status', 'is', null)
        .execute()
    }
  }
}
