import { signUpApplicant } from '../fixtures/signup'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { complexCommunityHealthForm } from '../fixtures/complex-community-health'

test('complex forms preserve native errors, nested answers, branching and manager draft recovery', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(180_000)
  page.setDefaultTimeout(15_000)
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
        data: { nameEn: `Roundtrip agency ${suffix}`, nameFr: `Agence aller-retour ${suffix}` }
      })
    ).json()
  ).agency
  const token = (
    await (
      await page.request.post('/api/admin/integration-tokens', {
        data: { name: 'Roundtrip integration', agencyId: agency.id }
      })
    ).json()
  ).token
  const integration = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` }
  })
  const applicantContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  try {
    const applicant = await applicantContext.newPage()
    applicant.setDefaultTimeout(15_000)
    expect(
      (
        await signUpApplicant(applicant.request, {
          data: {
            name: 'Roundtrip applicant',
            email: `roundtrip-${suffix}@example.test`,
            password: 'Applicant-test-only-2026!'
          }
        })
      ).ok()
    ).toBe(true)
    const user = (await (await applicant.request.get('/api/session')).json()).user
    const organization = (
      await (
        await applicant.request.post('/api/organizations', {
          data: { name: `Roundtrip organization ${suffix}` }
        })
      ).json()
    ).organization
    expect(
      (
        await applicant.request.patch(`/api/organizations/${organization.id}/members/${user.id}`, {
          data: { permissions: ['user', 'admin', 'application:manager', 'form:manager'] }
        })
      ).ok()
    ).toBe(true)
    expect(
      (
        await integration.request.post(
          `/api/government/agencies/${agency.id}/organizations/${organization.id}/verify`,
          {
            data: { foreignApplicantRecipientId: '401' }
          }
        )
      ).ok()
    ).toBe(true)
    const program = (
      await (
        await integration.request.post('/api/government/programs', {
          data: { agencyId: agency.id, nameEn: 'Program', nameFr: 'Programme' }
        })
      ).json()
    ).program
    const stream = (
      await (
        await integration.request.post('/api/government/streams', {
          data: {
            programId: program.id,
            nameEn: 'Stream',
            nameFr: 'Volet',
            sourceSystem: 'gcs-ssc',
            foreignSystemId: '301'
          }
        })
      ).json()
    ).stream
    const survey = (
      await (
        await integration.request.post('/api/government/surveys', {
          data: {
            agencyId: agency.id,
            definition: complexCommunityHealthForm()
          }
        })
      ).json()
    ).survey
    const call = (
      await (
        await integration.request.post('/api/government/calls', {
          data: {
            streamId: stream.id,
            nameEn: `Roundtrip funding ${suffix}`,
            nameFr: `Financement aller-retour ${suffix}`,
            startDate: '2020-01-01',
            endDate: '2099-12-31',
            sourceSystem: 'gcs-ssc-opportunity',
            foreignSystemId: '501'
          }
        })
      ).json()
    ).id
    expect(
      (
        await integration.request.put(`/api/government/calls/${call}/forms`, {
          data: { forms: [{ surveyId: survey.id, revision: survey.revision }] }
        })
      ).ok()
    ).toBe(true)
    expect(
      (
        await integration.request.patch(`/api/government/calls/${call}/publication`, {
          data: { published: true }
        })
      ).ok()
    ).toBe(true)
    const set = (
      await (
        await integration.request.post('/api/government/sets', {
          data: {
            organizationId: organization.id,
            agencyId: agency.id,
            agreementId: null,
            nameEn: 'Roundtrip organization report',
            nameFr: 'Rapport organisation aller-retour',
            sourceSystem: 'gcs-ssc-form',
            foreignSystemId: '601',
            items: [
              { id: 'report', kind: 'survey', surveyId: survey.id, surveyRevision: survey.revision }
            ]
          }
        })
      ).json()
    ).set
    expect(
      (
        await integration.request.post(`/api/government/sets/${set.id}/publish`, {
          data: { expectedRevision: set.revision }
        })
      ).ok()
    ).toBe(true)
    const errors: string[] = []
    applicant.on('pageerror', (error) => errors.push(error.message))
    const start = async () => {
      await applicant.goto(`/organizations/${organization.id}?section=funding`)
      await applicant
        .locator('.record-summary')
        .filter({ has: applicant.getByRole('heading', { name: `Roundtrip funding ${suffix}` }) })
        .getByRole('button', { name: 'Start application', exact: true })
        .click()
      await applicant.waitForURL('**/responses/**')
      return applicant.url().split('/').at(-1)!
    }
    const discardedId = await start()
    applicant.once('dialog', (dialog) => dialog.dismiss())
    await applicant.getByRole('button', { name: 'Delete draft', exact: true }).click()
    expect(
      (
        await applicant.request.get(
          `/api/organizations/${organization.id}/responses/${discardedId}`
        )
      ).status()
    ).toBe(200)
    const initial = (
      await (
        await applicant.request.get(
          `/api/organizations/${organization.id}/responses/${discardedId}`
        )
      ).json()
    ).response
    expect(
      (
        await applicant.request.put(
          `/api/organizations/${organization.id}/responses/${discardedId}`,
          { data: { expectedRevision: initial.revision, items: initial.items } }
        )
      ).ok()
    ).toBe(true)
    applicant.once('dialog', (dialog) => dialog.accept())
    await applicant.getByRole('button', { name: 'Delete draft', exact: true }).click()
    await expect(
      applicant.getByText('This record changed. Reload it before saving or submitting again.', {
        exact: false
      })
    ).toBeVisible()
    expect(
      (
        await applicant.request.get(
          `/api/organizations/${organization.id}/responses/${discardedId}`
        )
      ).status()
    ).toBe(200)
    await applicant.getByRole('button', { name: 'Reload', exact: true }).click()
    applicant.once('dialog', (dialog) => dialog.accept())
    await applicant.getByRole('button', { name: 'Delete draft', exact: true }).click()
    await applicant.waitForURL('**?section=funding')
    expect(
      (
        await applicant.request.get(
          `/api/organizations/${organization.id}/responses/${discardedId}`
        )
      ).status()
    ).toBe(404)
    const submissionId = await start()
    // Exercise the public eager GCDS entry with an error supplied before first render.
    await applicant.evaluate(() => {
      const control = document.createElement('gcds-checkboxes') as HTMLElement & {
        options: object[]
        errorMessage: string
        name: string
        legend: string
        validateOn: string
      }
      control.id = 'cold-checkbox-regression'
      control.name = 'cold-checkbox-regression'
      control.legend = 'Cold checkbox regression'
      control.options = [{ id: 'cold-checkbox-one', value: 'one', label: 'Cold option' }]
      control.validateOn = 'other'
      control.errorMessage = 'Choose one option.'
      document.querySelector('main')!.append(control)
    })
    const cold = applicant.locator('#cold-checkbox-regression').getByRole('checkbox')
    await expect(cold).toHaveAttribute('aria-invalid', 'true')
    await applicant.evaluate(() => {
      ;(
        document.getElementById('cold-checkbox-regression') as HTMLElement & {
          errorMessage: string
        }
      ).errorMessage = 'Choose an available option.'
    })
    await expect(cold).toHaveAttribute('aria-description', 'Choose an available option.')
    await applicant.evaluate(() => document.getElementById('cold-checkbox-regression')!.remove())
    await profile(applicant)
    await locations(applicant)
    await plan(applicant)
    await applicant
      .getByRole('combobox', { name: 'Information declaration' })
      .selectOption('confirmed')
    await applicant.getByRole('button', { name: 'Check responses', exact: true }).click()
    await expect(applicant.getByText('The responses are valid.', { exact: true })).toBeVisible()
    await applicant.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(applicant.getByText('You have unsaved changes.', { exact: false })).toHaveCount(0)
    await applicant.reload()
    await expect(
      applicant.getByRole('textbox', { name: 'Participants already enrolled' })
    ).toHaveValue('0')
    await applicant.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect(
      applicant
        .getByRole('region', { name: 'Location 2', exact: true })
        .getByRole('textbox', { name: 'Location name' })
    ).toHaveValue('Centre three')
    await applicant.getByRole('button', { name: 'Next page', exact: true }).click()
    await applicant.getByRole('button', { name: 'Next page', exact: true }).click()
    await applicant.getByRole('button', { name: 'Submit', exact: true }).click()
    await applicant.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    await expect(applicant.getByText('Submitted', { exact: true })).toBeVisible()
    await expect(applicant.getByRole('button', { name: 'Delete draft', exact: true })).toHaveCount(
      0
    )
    const exported = (
      await (await integration.request.get(`/api/government/submissions/${submissionId}`)).json()
    ).submission
    expect(exported.items[0].answers).toMatchObject({
      participant_count: '0',
      summary: 'Community-led clinics.\nAccessible health advice.'
    })
    expect(exported.items[0].answers).not.toHaveProperty('project_reference')
    expect(exported.application.externalStreamId).toBe('301')
    const siteRows = JSON.parse(exported.items[0].answers.sites)
    expect(siteRows).toHaveLength(2)
    expect(exported.items[0].answers[`site_name@${siteRows[1].id}`]).toBe('Centre three')
    expect(
      Object.keys(exported.items[0].answers)
        .filter((key) => key.startsWith('clinic_capacity@'))
        .map((key) => exported.items[0].answers[key])
    ).toEqual(['0', '0'])
    await applicant.goto(`/organizations/${organization.id}/sets/${set.id}`)
    await applicant.getByRole('button', { name: 'Start or continue draft', exact: true }).click()
    await applicant.waitForURL('**/responses/**')
    const reportId = applicant.url().split('/').at(-1)!
    expect(
      (
        await applicant.request.patch(`/api/organizations/${organization.id}/members/${user.id}`, {
          data: { permissions: ['user', 'admin', 'application:contributor', 'form:contributor'] }
        })
      ).ok()
    ).toBe(true)
    await applicant.reload()
    await expect(applicant.getByRole('button', { name: 'Delete draft', exact: true })).toHaveCount(
      0
    )
    const contributorDraft = (
      await (
        await applicant.request.get(`/api/organizations/${organization.id}/responses/${reportId}`)
      ).json()
    ).response
    expect(
      (
        await applicant.request.delete(
          `/api/organizations/${organization.id}/responses/${reportId}`,
          { data: { expectedRevision: contributorDraft.revision } }
        )
      ).status()
    ).toBe(403)
    expect(
      (
        await applicant.request.patch(`/api/organizations/${organization.id}/members/${user.id}`, {
          data: { permissions: ['user', 'admin', 'application:manager', 'form:manager'] }
        })
      ).ok()
    ).toBe(true)
    await applicant.reload()
    await profile(applicant)
    const partners = applicant
      .locator('.survey-repeat')
      .filter({ hasText: 'Delivery partner names' })
    await partners.getByRole('button', { name: 'Add item', exact: true }).click()
    await partners.getByRole('textbox').fill('Must be pruned')
    await applicant.getByRole('button', { name: 'Previous page', exact: true }).click()
    await applicant.getByRole('combobox', { name: 'Application pathway' }).selectOption('summary')
    await expect(applicant.getByRole('combobox', { name: 'Delivery region' })).toHaveValue('')
    await applicant.getByRole('combobox', { name: 'Delivery region' }).selectOption('remote')
    await applicant.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect(
      applicant.getByRole('heading', { name: 'Page 2: Confirm your information', exact: true })
    ).toBeVisible()
    await applicant
      .getByRole('combobox', { name: 'Information declaration' })
      .selectOption('confirmed')
    await applicant.getByRole('button', { name: 'Check responses', exact: true }).click()
    await applicant.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(applicant.getByText('You have unsaved changes.', { exact: false })).toHaveCount(0)
    await applicant.getByRole('button', { name: 'Submit', exact: true }).click()
    await applicant.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    await expect(applicant.getByText('Submitted', { exact: true })).toBeVisible()
    const report = (
      await (await integration.request.get(`/api/government/submissions/${reportId}`)).json()
    ).submission
    expect(report.items[0].answers).not.toHaveProperty('partners')
    expect(report.items[0].answers).not.toHaveProperty('budget')
    expect(report.items[0].answers.pathway).toBe('summary')
    expect(errors).toEqual([])
  } finally {
    await integration.close()
    await applicantContext.close()
  }
})

const profile = async (page: Page) => {
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.locator('[data-survey-errors]')).toBeFocused()
  await page.getByRole('textbox', { name: 'Project name' }).fill('Northern community health')
  await page
    .getByRole('textbox', { name: 'Community need and project summary' })
    .fill('Community-led clinics.\nAccessible health advice.')
  await page.getByRole('textbox', { name: 'Project contact email' }).fill('bad')
  await page.getByRole('textbox', { name: 'Participants already enrolled' }).fill('abc')
  await page.getByRole('textbox', { name: 'Planned start date' }).fill('2026-02-30')
  await page.getByRole('combobox', { name: 'Application pathway' }).selectOption('full')
  await page.getByRole('combobox', { name: 'Delivery region' }).selectOption('north')
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  for (const name of [
    'Project contact email',
    'Participants already enrolled',
    'Planned start date'
  ]) {
    const input = page.getByRole('textbox', { name })
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAttribute('aria-describedby', /error-message-/)
    await expect(input).toHaveAttribute('required', '')
  }
  await expect(
    page.getByRole('textbox', { name: 'Participants already enrolled' })
  ).toHaveAttribute('inputmode', 'decimal')
  await expect(
    page.getByRole('textbox', { name: 'Community need and project summary' })
  ).toHaveJSProperty('tagName', 'TEXTAREA')
  const advice = page.getByRole('checkbox', { name: 'Health advice', exact: true })
  await expect(advice).toHaveAttribute('aria-invalid', 'true')
  await expect(advice).not.toHaveAttribute('required', '')
  const localeIdentity = await advice.elementHandle()
  await page.locator('gcds-lang-toggle').getByRole('link').click()
  await expect(
    page.getByRole('checkbox', { name: 'Conseils de santé', exact: true })
  ).toHaveAttribute('aria-description', 'Saisissez une réponse.')
  await page.locator('gcds-lang-toggle').getByRole('link').click()
  await expect(advice).toHaveAttribute('aria-description', 'Enter a response.')
  expect(await advice.evaluate((element, previous) => element === previous, localeIdentity)).toBe(
    true
  )
  await advice.focus()
  await expect(advice).toBeFocused()
  const identity = await advice.elementHandle()
  await page.keyboard.press('Space')
  expect(
    await advice.evaluate(
      (element, previous) =>
        element === previous &&
        (element.getRootNode() as Document | ShadowRoot).activeElement === element,
      identity
    )
  ).toBe(true)
  await expect(advice).toBeChecked()
  await page.getByRole('checkbox', { name: 'Community training', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(
    page.getByRole('checkbox', { name: 'Community training', exact: true })
  ).toBeChecked()
  await page.getByRole('checkbox', { name: 'Community training', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(page.locator('gcds-checkboxes').filter({ has: advice })).toHaveJSProperty('value', [
    'advice'
  ])
  await page.getByRole('checkbox', { name: 'Community training', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: /Priority populations/ }).click()
  await page.getByRole('checkbox', { name: 'Youth', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('checkbox', { name: 'Seniors', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('textbox', { name: 'Project contact email' }).fill('health@example.test')
  await page.getByRole('textbox', { name: 'Participants already enrolled' }).fill('0')
  await page.getByRole('textbox', { name: 'Planned start date' }).fill('2026-11-01')
  await expect(page.locator('gcds-checkboxes').filter({ has: advice })).toHaveJSProperty('value', [
    'advice',
    'training'
  ])
  await expect(page.locator('.survey-computed')).toContainText('Northern community health — 0')
  await expect(page.locator('.survey-computed').getByRole('textbox')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.locator('.survey-page')).toBeFocused()
}

const locations = async (page: Page) => {
  const partners = page.locator('.survey-repeat').filter({ hasText: 'Delivery partner names' })
  await partners.getByRole('button', { name: 'Add item', exact: true }).click()
  await partners.getByRole('textbox').fill('Health partner')
  await page
    .getByRole('region', { name: 'Partner: Health partner', exact: true })
    .getByRole('textbox')
    .fill('partner@example.test')
  const sites = page.locator('.survey-repeat').filter({ hasText: 'Project locations' })
  for (const [index, name] of ['Centre one', 'Remove centre', 'Centre three'].entries()) {
    await sites.getByRole('button', { name: 'Add another', exact: true }).click()
    const site = page.getByRole('region', { name: `Location ${index + 1}`, exact: true })
    await site.getByRole('textbox', { name: 'Location name' }).fill(name)
    await site.getByRole('textbox', { name: 'Training arrangements' }).fill('Accessible training')
    await site.getByRole('button', { name: 'Add another', exact: true }).click()
    await site.getByRole('textbox', { name: 'Clinic session date' }).fill('2026-11-15')
    await site.getByRole('textbox', { name: 'Confirmed bookings' }).fill('0')
  }
  await expect(sites.getByRole('button', { name: 'Add another', exact: true })).toBeDisabled()
  await sites.getByRole('button', { name: 'Remove row 2', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Location 2', exact: true })
      .getByRole('textbox', { name: 'Location name' })
  ).toHaveValue('Centre three')
  const table = page.locator('.survey-table')
  for (const [index, sessions] of ['0.1', '0.2', '-0.3'].entries()) {
    await table.getByRole('button', { name: 'Add row', exact: true }).click()
    await table
      .getByRole('textbox', { name: 'Milestone' })
      .nth(index)
      .fill(`Milestone ${index + 1}`)
    await table.getByRole('textbox', { name: 'Sessions' }).nth(index).fill(sessions)
    await table.getByRole('textbox', { name: 'Due date' }).nth(index).fill('2026-11-30')
  }
  await expect(table.getByRole('button', { name: 'Add row', exact: true })).toBeDisabled()
  await expect(table.locator('output')).toHaveText(['0.1', '0.2', '-0.3', '0'])
  await table.getByRole('button', { name: 'Remove row', exact: true }).nth(2).click()
  await expect(table.locator('output')).toHaveText(['0.1', '0.2', '0.3'])
  await expect(table.getByRole('textbox', { name: 'Sessions' }).first()).toHaveAttribute(
    'inputmode',
    'decimal'
  )
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
}

const plan = async (page: Page) => {
  await page.getByRole('button', { name: 'Add a cost', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Cost category / line item' })
    .selectOption('facilitators')
  await page.getByRole('textbox', { name: 'Cost subsection' }).fill('Delivery')
  await page.getByRole('textbox', { name: 'Description', exact: false }).fill('Facilitator costs')
  await page.getByRole('textbox', { name: 'Total cost' }).fill('1500')
  await page.getByRole('textbox', { name: 'Program funding' }).fill('1000')
  await page.getByRole('button', { name: 'Add a funding source', exact: true }).click()
  await page.getByRole('combobox', { name: 'Funding type / source' }).selectOption('province')
  await page.getByRole('textbox', { name: 'Amount' }).fill('500')
  await page.getByRole('button', { name: 'Add an activity', exact: true }).click()
  for (const [name, answer] of [
    ['Activity name (English)', 'Health clinics'],
    ['Activity name (French)', 'Cliniques de santé'],
    ['Activity description (English)', 'Accessible advice'],
    ['Activity description (French)', 'Conseils accessibles'],
    ['Expected results (English)', 'Better access'],
    ['Expected results (French)', 'Meilleur accès']
  ])
    await page.getByRole('textbox', { name }).fill(answer!)
  await page.getByRole('textbox', { name: 'Start date' }).fill('2026-11-01')
  await page.getByRole('textbox', { name: 'End date' }).fill('2026-12-31')
  await page
    .getByRole('checkbox', { name: 'Improved access to health services', exact: true })
    .focus()
  await page.keyboard.press('Space')
  await page.getByRole('checkbox', { name: 'Applicant organization', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
}
