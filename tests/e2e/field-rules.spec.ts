import { expect, test } from '@playwright/test'
import { signUpApplicant } from '../fixtures/signup'
import { fullRuleForm } from '../fixtures/field-rule-form'

test('field rules show bilingual inline errors and allow draft, recovery and final submission', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(120000)
  const suffix = Date.now()
  expect(
    (
      await page.request.post('/api/admin/login', {
        data: { email: 'root@example.test', password: 'Root-test-only-2026!' }
      })
    ).ok()
  ).toBe(true)
  const agency = (
    await (
      await page.request.post('/api/admin/agencies', {
        data: { nameEn: `Field rules ${suffix}`, nameFr: `Règles ${suffix}` }
      })
    ).json()
  ).agency
  const token = (
    await (
      await page.request.post('/api/admin/integration-tokens', {
        data: { name: 'Field rules', agencyId: agency.id }
      })
    ).json()
  ).token
  const machine = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` }
  })
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  try {
    const program = (
      await (
        await machine.request.post('/api/government/programs', {
          data: { agencyId: agency.id, nameEn: 'Program', nameFr: 'Programme' }
        })
      ).json()
    ).program
    const stream = (
      await (
        await machine.request.post('/api/government/streams', {
          data: { programId: program.id, nameEn: 'Stream', nameFr: 'Volet' }
        })
      ).json()
    ).stream
    const created = await machine.request.post('/api/government/surveys', {
      data: { agencyId: agency.id, definition: fullRuleForm() }
    })
    expect(created.ok(), await created.text()).toBe(true)
    const survey = (await created.json()).survey
    const callId = (
      await (
        await machine.request.post('/api/government/calls', {
          data: {
            streamId: stream.id,
            nameEn: 'Rule-controlled application',
            nameFr: 'Demande avec règles',
            startDate: '2020-01-01',
            endDate: '2099-12-31'
          }
        })
      ).json()
    ).id
    expect(
      (
        await machine.request.put(`/api/government/calls/${callId}/survey`, {
          data: { surveyId: survey.id, revision: survey.revision }
        })
      ).ok()
    ).toBe(true)
    expect(
      (
        await machine.request.patch(`/api/government/calls/${callId}/publication`, {
          data: { published: true }
        })
      ).ok()
    ).toBe(true)
    const applicant = await context.newPage()
    expect(
      (
        await signUpApplicant(applicant.request, {
          data: {
            name: 'Rule applicant',
            email: `rules-${suffix}@example.test`,
            password: 'Applicant-test-only-2026!'
          }
        })
      ).ok()
    ).toBe(true)
    const userId = (await (await applicant.request.get('/api/session')).json()).user.id
    const organization = (
      await (
        await applicant.request.post('/api/organizations', {
          data: { name: `Rule organization ${suffix}` }
        })
      ).json()
    ).organization
    expect(
      (
        await applicant.request.patch(`/api/organizations/${organization.id}/members/${userId}`, {
          data: { permissions: ['user', 'admin', 'application:manager'] }
        })
      ).ok()
    ).toBe(true)
    // Preview runs the same rules without saving an application.
    await applicant.goto(`/forms/${organization.id}/${callId}`)
    await applicant.getByRole('textbox', { name: 'Start date' }).fill('2027-01-01')
    await applicant.getByRole('textbox', { name: 'End date' }).fill('2027-01-01')
    await applicant.getByRole('textbox', { name: 'Requested amount' }).fill('0')
    await expect(applicant.getByRole('textbox', { name: 'Project details' })).not.toHaveAttribute(
      'required',
      ''
    )
    await applicant.getByRole('button', { name: 'Check responses' }).click()
    const previewError = applicant
      .locator('gcds-input')
      .filter({ has: applicant.getByRole('textbox', { name: 'End date' }) })
    await expect(previewError.locator('gcds-error-message')).toContainText('Start date')
    await applicant.getByRole('textbox', { name: 'End date' }).fill('2027-01-02')
    await applicant.getByRole('button', { name: 'Check responses' }).click()
    await expect(applicant.getByText('The responses are valid.')).toBeVisible()
    const started = await applicant.request.post(
      `/api/organizations/${organization.id}/funding-calls/${callId}/applications`,
      {
        data: { locale: 'en' }
      }
    )
    expect(started.ok()).toBe(true)
    const response = (await started.json()).response
    await applicant.goto(`/organizations/${organization.id}/responses/${response.id}`)
    const endpoint = `/api/organizations/${organization.id}/responses/${response.id}`
    await applicant.getByRole('textbox', { name: 'Start date' }).fill('2027-01-01')
    await applicant.getByRole('button', { name: 'Save draft' }).click()
    await expect(applicant.getByText('You have unsaved changes.')).toHaveCount(0)
    let draft = (await (await applicant.request.get(endpoint)).json()).response
    expect(draft.items[0].answers).toEqual({ start: '2027-01-01' })
    expect(
      (
        await applicant.request.post(`${endpoint}/submit`, {
          data: {
            expectedRevision: draft.revision,
            balanceRevision: null,
            warningsAcknowledged: true
          }
        })
      ).status()
    ).toBe(400)
    await applicant.getByRole('textbox', { name: 'End date' }).fill('2027-01-01')
    await applicant.getByRole('textbox', { name: 'Requested amount' }).fill('101')
    await expect(applicant.getByRole('textbox', { name: 'Project details' })).toHaveAttribute(
      'required',
      ''
    )
    await applicant.getByRole('textbox', { name: 'Project details' }).fill('A project')
    await expect(
      applicant.getByRole('button', { name: 'Submit', exact: true }).first()
    ).toBeDisabled()
    await applicant.getByRole('button', { name: 'Check responses' }).click()
    const endError = applicant
      .locator('gcds-input')
      .filter({ has: applicant.getByRole('textbox', { name: 'End date' }) })
    await expect(endError.locator('gcds-error-message')).toContainText('Start date')
    await expect(applicant.locator('gcds-error-message').filter({ hasText: '100' })).toBeVisible()
    await applicant.screenshot({
      path: test.info().outputPath('field-rule-errors-en.png'),
      fullPage: true
    })
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    const frenchError = applicant
      .locator('gcds-input')
      .filter({ has: applicant.getByRole('textbox', { name: 'Date de fin' }) })
    await expect(frenchError.locator('gcds-error-message')).toContainText('Date de début')
    await applicant.setViewportSize({ width: 390, height: 844 })
    await expect(frenchError.locator('gcds-error-message')).toBeVisible()
    await applicant.screenshot({
      path: test.info().outputPath('field-rule-errors-fr-mobile.png'),
      fullPage: true
    })
    await expect(applicant.getByRole('textbox', { name: 'Date de fin' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    await applicant.getByRole('textbox', { name: 'Date de fin' }).fill('2027-01-02')
    await applicant.getByRole('textbox', { name: 'Montant demandé' }).fill('50.25')
    await applicant.setViewportSize({ width: 1280, height: 720 })
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    await applicant.getByRole('button', { name: 'Add row' }).click()
    await applicant.getByRole('button', { name: 'Add row' }).click()
    await applicant
      .getByRole('textbox', { name: 'Project name', exact: true })
      .nth(0)
      .fill('Garden')
    await applicant
      .getByRole('textbox', { name: 'Project name', exact: true })
      .nth(1)
      .fill('Garden')
    await applicant.getByRole('textbox', { name: 'Cost', exact: true }).nth(0).fill('10')
    await applicant.getByRole('textbox', { name: 'Cost', exact: true }).nth(1).fill('20')
    await applicant.getByRole('button', { name: 'Check responses' }).click()
    await expect(applicant.locator('gcds-notice').filter({ hasText: /unique/i })).toBeVisible()
    await expect(
      applicant.getByRole('textbox', { name: 'Project name', exact: true }).nth(1)
    ).toHaveAttribute('aria-description', 'Entry values must be unique.')
    await expect(
      applicant.getByRole('textbox', { name: 'Project name', exact: true }).nth(1)
    ).toHaveAccessibleDescription('Entry values must be unique.')
    await applicant.screenshot({
      path: test.info().outputPath('table-rule-error.png'),
      fullPage: true
    })
    await applicant
      .getByRole('textbox', { name: 'Project name', exact: true })
      .nth(1)
      .fill('Library')

    await applicant.getByRole('button', { name: 'Check responses' }).click()
    await expect(applicant.getByText('The responses are valid.')).toBeVisible()
    await applicant.getByRole('button', { name: 'Save draft' }).click()
    await expect(applicant.getByText('You have unsaved changes.')).toHaveCount(0)
    draft = (await (await applicant.request.get(endpoint)).json()).response
    expect(
      (
        await applicant.request.post(`${endpoint}/check`, {
          data: { expectedRevision: draft.revision }
        })
      ).ok()
    ).toBe(true)
    await applicant.getByRole('button', { name: 'Submit', exact: true }).first().click()
    await expect(applicant.getByRole('heading', { name: 'Review submission' })).toBeVisible()
    await applicant.getByRole('button', { name: 'Confirm submission' }).click()
    await expect(applicant.getByText('Form submitted.', { exact: true })).toBeVisible()
    await applicant.reload()
    await expect(applicant.getByText('2027-01-02', { exact: true })).toBeVisible()
    const submitted = (await (await applicant.request.get(endpoint)).json()).response
    expect(submitted.status).toBe('submitted')
    expect(submitted.snapshot.items[0].survey.schemaVersion).toBe(5)
    expect(submitted.items[0].answers).toMatchObject({ end: '2027-01-02', amount: '50.25' })
  } finally {
    await context.close()
    await machine.close()
  }
})
