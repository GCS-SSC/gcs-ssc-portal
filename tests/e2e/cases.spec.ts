import { test, expect, type Page, type Locator } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const select = async (page: Page | Locator, label: RegExp, name: string) => {
  const field = page.getByRole('combobox', { name: label })
  if (await field.evaluate((element) => element.tagName === 'SELECT'))
    await field.selectOption({ label: name })
  else {
    await field.click()
    await ('page' in page ? page.page() : page).getByRole('option', { name, exact: true }).click()
  }
}
test('government configures a case and ordered set; contributors save; managers acknowledge changing balances', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  expect(
    (
      await page.request.post('/api/auth/sign-in/email', {
        data: { email: 'root@example.test', password: 'Root-test-only-2026!' }
      })
    ).ok()
  ).toBe(true)
  const names = { nameEn: 'Case agency', nameFr: 'Agence des dossiers' }
  const agencyId = (
    await (await page.request.post('/api/government/agencies', { data: names })).json()
  ).agency.id
  const programId = (
    await (
      await page.request.post('/api/government/programs', { data: { ...names, agencyId } })
    ).json()
  ).program.id
  const streamId = (
    await (
      await page.request.post('/api/government/streams', {
        data: { nameEn: 'Case stream', nameFr: 'Volet des dossiers', programId }
      })
    ).json()
  ).stream.id
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  const applicant = await context.newPage()
  applicant.on('pageerror', (error) => errors.push(error.message))
  try {
    const signup = await applicant.request.post('/api/auth/sign-up/email', {
      data: {
        name: 'Claim Applicant',
        email: `claim-${Date.now()}@example.test`,
        password: 'Applicant-test-only-2026!'
      }
    })
    expect(signup.ok()).toBe(true)
    const userId = (await (await applicant.request.get('/api/session')).json()).user.id
    const organizationId = (
      await (
        await applicant.request.post('/api/organizations', {
          data: { name: 'Agreement recipient' }
        })
      ).json()
    ).organization.id
    const permissions = async (level: string) =>
      expect(
        (
          await applicant.request.patch(`/api/organizations/${organizationId}/members/${userId}`, {
            data: {
              permissions: ['user', 'admin', `claim:${level}`, `forecast:${level}`, `form:${level}`]
            }
          })
        ).ok()
      ).toBe(true)
    await permissions('contributor')
    await page.goto(`/government/cases/new?agencyId=${agencyId}`)
    await page.getByLabel(/^Name in English/).fill('Community agreement')
    await page.getByLabel(/^Name in French/).fill('Entente communautaire')
    await page.getByLabel(/^Organization ID/).fill(organizationId)
    await select(page, /^Stream/, 'Case stream')
    await page.getByLabel(/^Agreement number/).fill('AGR-2026')
    await page.getByLabel(/^Foreign system ID/).fill('10001')
    await page.getByLabel(/^GCS–SSC stream ID/).fill('10002')
    await page.getByRole('button', { name: 'Add fiscal year', exact: true }).click()
    await page.getByLabel(/^Fiscal year starting in April/).fill('2026')
    await page
      .getByRole('group', { name: 'Fiscal year 1', exact: true })
      .getByLabel(/^Foreign system ID/)
      .fill('10003')
    await page.getByRole('button', { name: 'Add budget line', exact: true }).click()
    const budget = page.getByRole('group', { name: 'Budget lines 1', exact: true })
    await budget.getByLabel(/^Name in English/).fill('Travel')
    await budget.getByLabel(/^Name in French/).fill('Déplacements')
    await budget.getByLabel(/^Cost category/).fill('Operations')
    await budget.getByLabel(/^Cost subsection/).fill('Travel')
    await budget.getByLabel(/^Foreign system ID/).fill('9007199254740993')
    await budget.getByLabel(/^Budgeted amount/).fill('200.00')
    await budget.getByLabel(/^Remaining balance/).fill('100.00')
    await budget.getByLabel(/^Balance as of/).fill('2026-09-01T00:00:00Z')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).toHaveURL(/\/government\/cases\/[0-9a-f-]{36}\?/)
    const caseId = new URL(page.url()).pathname.split('/').at(-1)!
    const fundingCase = (await (await page.request.get(`/api/government/cases/${caseId}`)).json())
      .case
    expect(fundingCase.streamId).toBe(streamId)
    await page.goto(`/government/sets/new?agencyId=${agencyId}`)
    await select(page, /^Publish under/, 'Community agreement')
    await page.getByLabel(/^Name in English/).fill('Annual claim')
    await page.getByLabel(/^Name in French/).fill('Réclamation annuelle')
    await page.getByRole('button', { name: 'Add item', exact: true }).click()
    await select(page, /^Item type/, 'Claims')
    await page.getByRole('button', { name: 'Add item', exact: true }).click()
    await select(
      page.getByRole('group', { name: 'Item 2', exact: true }),
      /^Item type/,
      'Forecasts'
    )
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).toHaveURL(/\/government\/sets\/[0-9a-f-]{36}\?/)
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Withdraw publication', exact: true })
    ).toBeVisible()
    await expect(page.getByLabel(/^Name in English/)).toBeDisabled()
    await applicant.goto(`/organizations/${organizationId}/work`)
    await applicant.getByRole('button', { name: 'Start or continue draft', exact: true }).click()
    await expect(applicant).toHaveURL(/\/responses\/[0-9a-f-]{36}$/)
    const responseId = applicant.url().split('/').at(-1)!
    await expect(applicant.getByText('100.00', { exact: true })).toBeVisible()
    await applicant.getByLabel(/^Amount/).fill('125.50')
    await applicant.getByRole('button', { name: 'Next item', exact: true }).click()
    await applicant
      .getByRole('button', { name: 'Fill blank amounts with zero', exact: true })
      .click()
    await applicant.getByLabel(/^April/).fill('25.00')
    await applicant.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(applicant.getByText('Changes saved.', { exact: true })).toBeVisible()
    await expect(
      applicant.getByRole('button', { name: 'Review and submit', exact: true })
    ).toHaveCount(0)
    await applicant.getByRole('button', { name: 'Previous item', exact: true }).click()
    await permissions('manager')
    await applicant.reload()
    await applicant.getByRole('button', { name: 'Review and submit', exact: true }).click()
    await expect(
      applicant.getByText(/The requested amount exceeds the reported balance/)
    ).toBeVisible()
    expect(
      (
        await page.request.put(`/api/government/cases/${caseId}/balances`, {
          data: {
            expectedRevision: 1,
            asOf: '2026-09-02T00:00:00Z',
            lines: [
              {
                foreignSystemId: '9007199254740993',
                budgetedAmount: '200.00',
                balance: '50.00',
                claimedAmount: '150.00',
                forecastAmount: '25.00'
              }
            ]
          }
        })
      ).ok()
    ).toBe(true)
    await applicant.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    await expect(
      applicant
        .getByRole('alert')
        .filter({ hasText: 'This record changed. Reload it before saving or submitting again.' })
    ).toBeVisible()
    await applicant.getByRole('button', { name: 'Cancel', exact: true }).click()
    await applicant.getByRole('button', { name: 'Review and submit', exact: true }).click()
    await expect(applicant.getByText('50.00', { exact: true })).toBeVisible()
    mkdirSync('.agent/visual', { recursive: true })
    const theme = (await applicant.locator('gcds-header').count()) ? 'gcdesign' : 'nuxtui'
    await applicant.screenshot({ path: `.agent/visual/${theme}-claim-review.png`, fullPage: true })
    await applicant.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    await expect(
      applicant.getByText('This submission is final and cannot be edited.', { exact: true })
    ).toBeVisible()
    await expect(applicant.getByLabel(/^Amount/)).toBeDisabled()
    const result = await (
      await applicant.request.get(`/api/organizations/${organizationId}/responses/${responseId}`)
    ).json()
    const exported = await (
      await page.request.get(`/api/government/submissions/${result.response.submissionId}`)
    ).json()
    expect(exported.submission).toMatchObject({
      balancesAtSubmission: [{ balance: '50.00', balanceAsOf: '2026-09-02T00:00:00Z' }],
      items: [
        { claim: { lineItems: [{ budgetLineItemId: '9007199254740993', amount: '125.50' }] } },
        { kind: 'forecast', forecast: { header: { egcs_fc_fiscalyear: '10003' } } }
      ]
    })
    // A separately published organization form uses the same headless provider.
    const survey = (
      await (
        await page.request.post('/api/government/surveys', {
          data: {
            agencyId,
            definition: {
              schemaVersion: 1,
              title: { en: 'Annual report', fr: 'Rapport annuel' },
              questions: [
                {
                  id: 'summary',
                  type: 'text',
                  label: { en: 'Activity summary', fr: 'Résumé des activités' },
                  required: true,
                  maxLength: 200
                }
              ]
            }
          }
        })
      ).json()
    ).survey
    const standalone = (
      await (
        await page.request.post('/api/government/sets', {
          data: {
            agencyId,
            organizationId,
            caseId: null,
            nameEn: 'Organization report',
            nameFr: 'Rapport de l’organisation',
            items: [{ id: 'report', kind: 'survey', surveyId: survey.id, surveyRevision: 1 }]
          }
        })
      ).json()
    ).set
    expect(
      (
        await page.request.post(`/api/government/sets/${standalone.id}/publish`, {
          data: { expectedRevision: standalone.revision }
        })
      ).ok()
    ).toBe(true)
    await applicant.goto(`/organizations/${organizationId}/work`)
    await applicant
      .locator('li')
      .filter({ hasText: 'Organization report' })
      .getByRole('button', { name: 'Start or continue draft' })
      .click()
    await applicant.getByLabel(/^Activity summary/).fill('The community completed its project.')
    await applicant.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(applicant.getByText('Changes saved.', { exact: true })).toBeVisible()
    await applicant.getByRole('button', { name: 'Review and submit', exact: true }).click()
    await applicant.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    await expect(
      applicant.getByText('This submission is final and cannot be edited.', { exact: true })
    ).toBeVisible()
    await expect(
      applicant.getByText('The community completed its project.', { exact: true })
    ).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})
