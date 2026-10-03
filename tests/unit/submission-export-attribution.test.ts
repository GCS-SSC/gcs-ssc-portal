import { describe, expect, it } from 'vitest'
import { buildSubmissionExport } from '../../server/utils/submission-export'
import {
  responseItemSchema,
  type ResponseItem,
  type SetSnapshot
} from '../../shared/schemas/agreements'

const snapshot = (proponent: string | null): SetSnapshot => ({
  schemaVersion: 1,
  publicationId: 'published',
  nameEn: 'Claim',
  nameFr: 'Réclamation',
  sourceSystem: 'gcs-ssc',
  foreignSystemId: '100',
  agreementReference: {
    id: 1,
    agreementNumber: 'AGR-1',
    sourceSystem: 'gcs-ssc',
    foreignSystemId: '100',
    externalStreamId: '10',
    externalApplicantRecipientId: proponent
  },
  items: [{ item: { id: 'claim', kind: 'claim', fiscalYearId: 'fy' } }],
  agreement: {
    id: 1,
    revision: 1,
    agreementNumber: 'AGR-1',
    config: {
      sourceSystem: 'gcs-ssc',
      foreignSystemId: '100',
      externalStreamId: '10',
      externalApplicantRecipientId: '501',
      claimInstruction: null,
      forecastInstruction: null,
      fiscalYears: [{ id: 'fy', startYear: 2026, foreignSystemId: '20' }],
      budgetLines: [
        {
          id: 'line',
          fiscalYearId: 'fy',
          foreignSystemId: '30',
          nameEn: 'Expense',
          nameFr: 'Dépense',
          costCategory: 'Delivery',
          costSubsection: 'Operations',
          budgetedAmount: '100.00',
          balance: null,
          claimedAmount: null,
          forecastAmount: null,
          balanceAsOf: null,
          currency: 'cad'
        }
      ]
    }
  }
})
const item: ResponseItem = {
  id: 'claim',
  kind: 'claim',
  isFinalForYear: false,
  periodStart: 0,
  periodEnd: 1,
  lines: [{ budgetLineId: 'line', description: 'Expense', amount: '10.00' }]
}
const exported = (proponent: string | null) =>
  buildSubmissionExport({
    submissionId: 'submission',
    responseId: 'response',
    setId: 'set',
    setRevision: 1,
    organizationId: 'organization',
    locale: 'en',
    submittedAt: '2026-06-01T00:00:00.000Z',
    snapshot: snapshot(proponent),
    items: [item],
    forecastIterations: {}
  }).items[0]

describe('Claim submitting Proponent interchange', () => {
  it('retains the publication organization link rather than the shared Agreement default', () => {
    expect(exported('502')).toMatchObject({
      mappingComplete: true,
      claim: { agreementId: '100', applicantRecipientId: '502' }
    })
    expect(snapshot('502').agreement?.config.externalApplicantRecipientId).toBe('501')
  })
  it('marks an unlinked Claim incomplete and refuses a Proponent selected in organization input', () => {
    expect(exported(null)).toMatchObject({
      mappingComplete: false,
      claim: { applicantRecipientId: null }
    })
    expect(responseItemSchema.safeParse({ ...item, applicantRecipientId: '501' }).success).toBe(
      false
    )
  })
})
