import { sql, type Kysely } from 'kysely'
import { v7 as uuid } from 'uuid'
import { agreementInput, setInput, type SetSnapshot } from '../../../shared/schemas/agreements'
import type { Database } from '../schema'

const examples = [
  {
    agreementNumber: 'DEMO-001',
    nameEn: 'Community Food Access Agreement',
    nameFr: 'Entente pour l’accès communautaire à l’alimentation',
    lines: [
      {
        id: 'food',
        nameEn: 'Food and supplies',
        nameFr: 'Aliments et fournitures',
        amount: '80000.00'
      },
      {
        id: 'delivery',
        nameEn: 'Community delivery',
        nameFr: 'Livraison communautaire',
        amount: '40000.00'
      }
    ]
  },
  {
    agreementNumber: 'DEMO-002',
    nameEn: 'Digital Skills Training Agreement',
    nameFr: 'Entente de formation en compétences numériques',
    lines: [
      {
        id: 'training',
        nameEn: 'Training sessions',
        nameFr: 'Séances de formation',
        amount: '60000.00'
      },
      {
        id: 'equipment',
        nameEn: 'Learning equipment',
        nameFr: 'Équipement d’apprentissage',
        amount: '30000.00'
      }
    ]
  },
  {
    agreementNumber: 'DEMO-003',
    nameEn: 'Neighbourhood Green Spaces Agreement',
    nameFr: 'Entente pour les espaces verts de quartier',
    lines: [
      {
        id: 'landscaping',
        nameEn: 'Landscaping',
        nameFr: 'Aménagement paysager',
        amount: '100000.00'
      },
      {
        id: 'outreach',
        nameEn: 'Community outreach',
        nameFr: 'Mobilisation communautaire',
        amount: '50000.00'
      }
    ]
  }
] as const

/** Add playable financial agreements without overwriting the original demo fixtures or later edits. */
export const demoAgreementsMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const owner = await db
      .selectFrom('user')
      .select('id')
      .where('email', '=', 'owner@portal.com')
      .executeTakeFirstOrThrow()
    await db
      .updateTable('user')
      .set({ emailVerified: true })
      .where('email', 'in', [
        'owner@portal.com',
        'contributor@portal.com',
        'viewer@portal.com',
        'user@portal.com'
      ])
      .execute()
    const organization = await db
      .selectFrom('organization')
      .select('id')
      .where('ownerId', '=', owner.id)
      .orderBy('createdAt', 'asc')
      .executeTakeFirstOrThrow()
    const call = await db
      .selectFrom('funding_call')
      .select(['agencyId', 'streamId'])
      .orderBy('createdAt', 'asc')
      .executeTakeFirstOrThrow()
    const now = new Date()
    const balanceAsOf = now.toISOString()
    const fiscalYear = now.getUTCFullYear()

    for (const example of examples) {
      const agreementId = uuid()
      const config = agreementInput.parse({
        organizationId: organization.id,
        streamId: call.streamId,
        nameEn: example.nameEn,
        nameFr: example.nameFr,
        agreementNumber: example.agreementNumber,
        config: {
          sourceSystem: 'demo',
          foreignSystemId: null,
          externalStreamId: null,
          externalApplicantRecipientId: null,
          fiscalYears: [{ id: 'current-year', startYear: fiscalYear, foreignSystemId: null }],
          budgetLines: example.lines.map((line) => ({
            id: line.id,
            fiscalYearId: 'current-year',
            foreignSystemId: null,
            nameEn: line.nameEn,
            nameFr: line.nameFr,
            costCategory: 'Community programs',
            costSubsection: line.nameEn,
            budgetedAmount: line.amount,
            balance: line.amount,
            claimedAmount: '0.00',
            forecastAmount: '0.00',
            balanceAsOf,
            currency: 'cad'
          }))
        }
      })
      await db
        .insertInto('funding_agreement')
        .values({
          id: agreementId,
          organizationId: organization.id,
          agencyId: call.agencyId,
          streamId: call.streamId,
          nameEn: example.nameEn,
          nameFr: example.nameFr,
          agreementNumber: example.agreementNumber,
          config: sql`${JSON.stringify(config.config)}::jsonb`,
          sourceSystem: 'demo',
          foreignSystemId: null,
          revision: 1,
          createdAt: now
        })
        .execute()

      // Each agreement has a published claim/forecast set accessible from Agreements.
      const set = setInput.parse({
        organizationId: organization.id,
        agencyId: call.agencyId,
        agreementId,
        nameEn: `${example.nameEn} — Claims and forecasts`,
        nameFr: `${example.nameFr} — Demandes de remboursement et prévisions`,
        sourceSystem: 'demo',
        foreignSystemId: null,
        items: [
          { id: 'claim', kind: 'claim', fiscalYearId: 'current-year' },
          { id: 'forecast', kind: 'forecast', fiscalYearId: 'current-year' }
        ]
      })
      const snapshot: SetSnapshot = {
        schemaVersion: 1,
        publicationId: uuid(),
        agreementReference: {
          id: agreementId,
          agreementNumber: example.agreementNumber,
          sourceSystem: 'demo',
          foreignSystemId: null,
          externalStreamId: null,
          externalApplicantRecipientId: null
        },
        nameEn: set.nameEn,
        nameFr: set.nameFr,
        sourceSystem: 'demo',
        foreignSystemId: null,
        items: set.items.map((item) => ({ item })),
        agreement: {
          id: agreementId,
          revision: 1,
          agreementNumber: example.agreementNumber,
          config: config.config
        }
      }
      await db
        .insertInto('submission_set')
        .values({
          id: uuid(),
          organizationId: organization.id,
          agencyId: call.agencyId,
          agreementId,
          callId: null,
          nameEn: set.nameEn,
          nameFr: set.nameFr,
          sourceSystem: 'demo',
          foreignSystemId: null,
          items: sql`${JSON.stringify(set.items)}::jsonb`,
          snapshot: sql`${JSON.stringify(snapshot)}::jsonb`,
          revision: 2,
          published: true,
          createdAt: now
        })
        .execute()
    }
  }
}
