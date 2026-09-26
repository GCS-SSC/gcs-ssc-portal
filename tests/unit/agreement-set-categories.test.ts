import { expect, it } from 'vitest'
import { setInput } from '../../shared/schemas/agreements'

const base = {
  nameEn: 'Quarterly submission',
  nameFr: 'Soumission trimestrielle',
  organizationId: 1,
  agencyId: 2,
  agreementId: 3
}

it('keeps claims and forecasts in distinct published form sets', () => {
  const claim = { id: 'claim', kind: 'claim' as const, fiscalYearId: 'fy' }
  const forecast = { id: 'forecast', kind: 'forecast' as const, fiscalYearId: 'fy' }
  const survey = {
    id: 'report',
    kind: 'survey' as const,
    surveyId: 4,
    surveyRevision: 1
  }

  expect(setInput.safeParse({ ...base, items: [claim, forecast] }).success).toBe(false)
  expect(setInput.safeParse({ ...base, items: [claim, survey] }).success).toBe(true)
  expect(setInput.safeParse({ ...base, items: [forecast, survey] }).success).toBe(true)
})
