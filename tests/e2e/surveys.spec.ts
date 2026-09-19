import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { pushSurvey } from '@gcs-ssc/survey/client'
import type { SurveyDefinition } from '@gcs-ssc/survey'
const select = async (page: Page, label: RegExp, text: string) => {
  const field = page.getByRole('combobox', { name: label })
  if (await field.evaluate((element) => element.tagName === 'SELECT'))
    await field.selectOption({ label: text })
  else {
    await field.click()
    await page.getByRole('option', { name: text, exact: true }).click()
  }
}
test('headless designer, preview validation, pinned call revisions and extension import work in either theme', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(120000)
  // HTTP LAN development exposes getRandomValues but not randomUUID.
  await page.addInitScript(() =>
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true })
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/government/login')
  await page.getByLabel(/^Email address/).fill('root@example.test')
  await page.getByLabel(/^Password/).fill('Root-test-only-2026!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/government$/)
  await page.getByLabel(/^Name in English/).fill('Survey agency')
  await page.getByLabel(/^Name in French/).fill('Organisme de sondages')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Survey agency' })).toBeVisible()
  const agencyId = page.url().split('/').at(-1)!
  await page.getByRole('link', { name: 'Application forms', exact: true }).click()
  await page.getByRole('link', { name: 'Create a form', exact: true }).click()
  await page.getByLabel(/^Form title in English/).fill('Project application')
  await page.getByLabel(/^Form title in French/).fill('Demande de projet')
  const questions = [
    ['Text', 'Project name', 'Nom du projet'],
    ['Email', 'Contact email', 'Courriel de contact'],
    ['Number', 'Requested amount', 'Montant demandé'],
    ['Date', 'Project start', 'Début du projet'],
    ['Single choice', 'Project category', 'Catégorie du projet']
  ]
  for (const [kind, en, fr] of questions) {
    await page.getByRole('button', { name: 'Add question', exact: true }).click()
    await select(page, /^Control/, kind!)
    await page.getByLabel(/^Question in English/).fill(en!)
    await page.getByLabel(/^Question in French/).fill(fr!)
    await select(page, /^Response requirement/, 'Required')
    if (kind === 'Single choice') {
      await page.getByLabel(/^Choice in English 1/).fill('Community')
      await page.getByLabel(/^Choice in French 1/).fill('Communauté')
      await page.getByLabel(/^Choice in English 2/).fill('Research')
      await page.getByLabel(/^Choice in French 2/).fill('Recherche')
    }
    await page.getByRole('button', { name: 'Apply question changes', exact: true }).click()
    await expect(page.getByRole('button', { name: `Edit ${en}`, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Save form revision', exact: true }).click()
  await expect(page).toHaveURL(/\/government\/surveys\/[0-9a-f-]{36}$/)
  const surveyId = page.url().split('/').at(-1)!
  await expect(page.getByText('Saved revision 1', { exact: true })).toBeVisible()
  // Reload exercises package support for Vue-reactive fetched definitions.
  const surveyUrl = `**/api/government/surveys/${surveyId}`
  await page.route(surveyUrl, (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } })
  )
  await page.reload()
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  await page.unroute(surveyUrl)
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator(`a[href="/government/surveys?agencyId=${agencyId}"]`)).toBeVisible()
  await page.getByRole('button', { name: 'Edit Project category', exact: true }).click()
  await expect(page.getByLabel(/^Choice in English 1/)).toHaveValue('Community')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Check responses', exact: true }).click()
  await expect(page.getByText('Enter a response.', { exact: true })).toHaveCount(5)
  await expect(page.locator('[data-survey-errors]')).toBeFocused()
  const nameField = page.getByRole('textbox', { name: /^Project name/ })
  await expect(nameField).toHaveAttribute('required', '')
  await nameField.fill('Digital project')
  await page.getByRole('textbox', { name: /^Contact email/ }).fill('contact@example.test')
  await page.getByRole('textbox', { name: /^Requested amount/ }).fill('0')
  await page.getByRole('textbox', { name: /^Project start/ }).fill('2028-02-29')
  await select(page, /^Project category/, 'Research')
  await page.getByRole('button', { name: 'Check responses', exact: true }).click()
  await expect(page.getByText('The responses are valid.', { exact: true })).toBeVisible()
  await page
    .locator('[data-survey-preview]')
    .getByRole('button', { name: 'Previous page', exact: true })
    .click()
  await page.getByRole('button', { name: 'Français', exact: true }).click()
  await expect(page.getByRole('textbox', { name: /^Nom du projet/ })).toHaveValue('Digital project')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Concepteur de sondages' })
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  mkdirSync('.agent/visual', { recursive: true })
  const theme = (await page.locator('gcds-header').count()) ? 'gcdesign' : 'nuxtui'
  await page.screenshot({ path: `.agent/visual/${theme}-survey-mobile-fr.png`, fullPage: true })
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 1000 })
  // Configure a call through the same API used by the government UI.
  const program = (
    await (
      await page.request.post('/api/government/programs', {
        data: { agencyId, nameEn: 'Program', nameFr: 'Programme' }
      })
    ).json()
  ).program
  const stream = (
    await (
      await page.request.post('/api/government/streams', {
        data: { programId: program.id, nameEn: 'Stream', nameFr: 'Volet' }
      })
    ).json()
  ).stream
  const call = (
    await (
      await page.request.post('/api/government/calls', {
        data: {
          streamId: stream.id,
          nameEn: 'Survey call',
          nameFr: 'Appel avec formulaire',
          startDate: '2027-01-01',
          endDate: '2027-12-31'
        }
      })
    ).json()
  ).id
  await page.goto(`/government/agencies/${agencyId}`)
  await page.getByRole('button', { name: 'Calls for proposals', exact: true }).click()
  await select(page, /^Application form/, 'Project application (Revision 1)')
  await page.getByRole('button', { name: 'Attach revision', exact: true }).click()
  await expect(page.getByText(/Attached revision 1/)).toBeVisible()
  expect(
    (
      await page.request.patch(`/api/government/calls/${call}/publication`, {
        data: { published: true }
      })
    ).ok()
  ).toBe(true)
  // Import using the exported server-side client, with a real scoped credential.
  const credential = await (
    await page.request.post('/api/government/integration-tokens', {
      data: { agencyId, name: 'Survey extension' }
    })
  ).json()
  const definition: SurveyDefinition = {
    schemaVersion: 1,
    title: { en: 'Imported application', fr: 'Demande importée' },
    questions: [
      {
        id: 'title',
        type: 'text',
        label: { en: 'Imported title', fr: 'Titre importé' },
        required: true,
        maxLength: 200
      }
    ]
  }
  const transport: typeof fetch = async (url, init) => {
    const response = await page.request.fetch(String(url), {
      method: init?.method,
      headers: init?.headers as Record<string, string>,
      data: String(init?.body),
      maxRedirects: 0
    })
    return new Response(await response.body(), {
      status: response.status(),
      headers: response.headers()
    })
  }
  const imported = await pushSurvey({
    portalUrl: baseURL!,
    token: credential.token,
    agencyId,
    definition,
    fetch: transport
  })
  expect(imported.survey.revision).toBe(1)
  await page.goto(`/government/surveys/${imported.survey.id}`)
  await expect(page.getByLabel(/^Form title in English/)).toHaveValue('Imported application')
  // Survey-specific body limit accepts a valid form larger than the general 16 KiB limit.
  const larger = {
    ...definition,
    questions: Array.from({ length: 20 }, (_, index) => ({
      ...definition.questions[0]!,
      id: `q_${index}`,
      hint: { en: 'a'.repeat(500), fr: 'b'.repeat(500) }
    }))
  }
  expect(
    (
      await page.request.post('/api/government/surveys', { data: { agencyId, definition: larger } })
    ).status()
  ).toBe(200)
  expect(
    (
      await page.request.put(`/api/government/surveys/${surveyId}`, {
        data: { expectedRevision: 1, definition }
      })
    ).status()
  ).toBe(200)
  expect(
    (
      await page.request.put(`/api/government/surveys/${surveyId}`, {
        data: { expectedRevision: 1, definition }
      })
    ).status()
  ).toBe(409)
  const applicantContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  const applicant = await applicantContext.newPage()
  try {
    expect(
      (
        await applicant.request.post('/api/auth/sign-up/email', {
          data: {
            name: 'Survey applicant',
            email: `survey-${Date.now()}@example.test`,
            password: 'Survey-applicant-2026!'
          }
        })
      ).ok()
    ).toBe(true)
    const user = (await (await applicant.request.get('/api/session')).json()).user
    const org = (
      await (
        await applicant.request.post('/api/organizations', {
          data: { name: 'Survey organization' }
        })
      ).json()
    ).organization
    const url = `/api/organizations/${org.id}/funding-calls/${call}/survey`
    expect((await applicant.request.get(url)).status()).toBe(403)
    expect((await applicant.request.get(`/api/government/surveys/${surveyId}`)).status()).toBe(403)
    await applicant.request.patch(`/api/organizations/${org.id}/members/${user.id}`, {
      data: { permissions: ['user', 'admin', 'application'] }
    })
    expect((await (await applicant.request.get(url)).json()).survey.revision).toBe(1)
    await applicant.goto(`/funding/${org.id}`)
    await applicant.locator(`a[href="/forms/${org.id}/${call}"]`).click()
    await expect(
      applicant.getByRole('heading', { name: 'Project application', exact: true })
    ).toBeVisible()
    await expect(
      applicant.getByText('Preview only. Responses are not saved or submitted.')
    ).toBeVisible()
    await page.request.patch(`/api/government/calls/${call}/publication`, {
      data: { published: false }
    })
    expect((await applicant.request.get(url)).status()).toBe(404)
  } finally {
    await applicantContext.close()
  }
  expect(errors).toEqual([])
})

test('authors bilingual hierarchy and branching, and revisits the actual route without stale responses', async ({
  page
}) => {
  test.setTimeout(120000)
  await page.goto('/government/login')
  await page.getByLabel(/^Email address/).fill('root@example.test')
  await page.getByLabel(/^Password/).fill('Root-test-only-2026!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/government$/)
  const { agency } = await (
    await page.request.post('/api/government/agencies', {
      data: { nameEn: 'Flow agency', nameFr: 'Organisme de parcours' }
    })
  ).json()
  const { survey } = await (
    await page.request.post('/api/government/surveys', {
      data: {
        agencyId: agency.id,
        definition: {
          schemaVersion: 1,
          title: { en: 'Branching application', fr: 'Demande conditionnelle' },
          questions: [
            {
              id: 'eligible',
              type: 'select',
              label: { en: 'Include project details?', fr: 'Inclure les détails du projet?' },
              required: true,
              options: [
                { value: 'yes', label: { en: 'Yes', fr: 'Oui' } },
                { value: 'no', label: { en: 'No', fr: 'Non' } }
              ]
            },
            {
              id: 'details',
              type: 'text',
              label: { en: 'Project details', fr: 'Détails du projet' },
              maxLength: 500,
              required: true
            },
            {
              id: 'email',
              type: 'email',
              label: { en: 'Final contact', fr: 'Contact final' },
              required: true
            }
          ]
        }
      }
    })
  ).json()
  await page.goto(`/government/surveys/${survey.id}`)
  await page
    .getByLabel(/^Description in English/)
    .first()
    .fill('Describe the proposal.')
  await expect(page.getByLabel(/^Description in French/).first()).toHaveAttribute('required', '')
  await page.getByRole('button', { name: 'Save form revision', exact: true }).click()
  await expect(
    page.getByText(
      'Check both languages, question placements, conditions and forward page destinations before saving.',
      { exact: true }
    )
  ).toBeVisible()
  await page
    .getByLabel(/^Description in French/)
    .first()
    .fill('Décrivez la proposition.')
  await page.getByRole('button', { name: 'Add page', exact: true }).click()
  await page.getByRole('button', { name: 'Add page', exact: true }).click()
  const page2 = page.locator('[data-survey-page]').nth(1)
  await page2.locator('summary').first().click()
  await page2.getByLabel(/^Heading in English/).fill('Project')
  await page2.getByLabel(/^Heading in French/).fill('Projet')
  await page2.getByRole('button', { name: 'Add section', exact: true }).click()
  const section = page2.locator('details').first()
  await section.locator('summary').first().click()
  await section.getByLabel(/^Heading in English/).fill('Activities')
  await section.getByLabel(/^Heading in French/).fill('Activités')
  await section.getByRole('button', { name: 'Add subsection', exact: true }).click()
  const subsection = section.locator('details').first()
  await subsection.locator('summary').first().click()
  await subsection.getByLabel(/^Heading in English/).fill('Work plan')
  await subsection.getByLabel(/^Heading in French/).fill('Plan de travail')
  await select(
    page,
    /^Place question in: Project details/,
    'Page 2: Project / Activities / Work plan'
  )
  await select(page, /^Place question in: Final contact/, 'Page 3: Page 3')
  const page1 = page.locator('[data-survey-page]').nth(0)
  await page1.locator('summary').first().click()
  await page1.getByRole('button', { name: 'Add branch', exact: true }).click()
  const selectWithin = async (label: string, text: string) => {
    const field = page1.getByRole('combobox', { name: new RegExp(`^${label}`) })
    if (await field.evaluate((element) => element.tagName === 'SELECT'))
      await field.selectOption({ label: text })
    else {
      await field.click()
      await page.getByRole('option', { name: text, exact: true }).click()
    }
  }
  await selectWithin('Comparison 1', 'Equals')
  await selectWithin('Compared value 1', 'No')
  await selectWithin('Go to', 'Page 3')
  await page.getByRole('button', { name: 'Save form revision', exact: true }).click()
  await expect(page.getByText('Saved revision 2', { exact: true })).toBeVisible()
  await page.reload()
  const persisted = (await (await page.request.get(`/api/government/surveys/${survey.id}`)).json())
    .survey.definition
  expect(persisted.schemaVersion).toBe(2)
  expect(persisted.pages[1].sections[0].subsections[0].title).toEqual({
    en: 'Work plan',
    fr: 'Plan de travail'
  })
  expect(persisted.pages[0].branches[0].destination.pageId).toBe(persisted.pages[2].id)
  const preview = page.locator('[data-survey-preview]')
  await preview.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(preview.locator('[data-survey-errors]')).toBeFocused()
  await select(page, /^Include project details\?/, 'Yes')
  await preview.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(preview.getByRole('heading', { name: 'Work plan', exact: true })).toBeVisible()
  await preview.getByRole('textbox', { name: /^Project details/ }).fill('Old route answer')
  await preview.getByRole('button', { name: 'Next page', exact: true }).click()
  await preview.getByRole('button', { name: 'Previous page', exact: true }).click()
  await preview.getByRole('button', { name: 'Previous page', exact: true }).click()
  await select(page, /^Include project details\?/, 'No')
  await preview.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(preview.getByRole('textbox', { name: /^Final contact/ })).toBeVisible()
  await expect(preview.getByRole('textbox', { name: /^Project details/ })).toHaveCount(0)
  await preview.getByRole('button', { name: 'Previous page', exact: true }).click()
  await select(page, /^Include project details\?/, 'Yes')
  await preview.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(preview.getByRole('textbox', { name: /^Project details/ })).toHaveValue('')
  await preview.getByRole('textbox', { name: /^Project details/ }).fill('New route answer')
  await page.getByRole('button', { name: 'Français', exact: true }).click()
  await expect(preview.getByRole('heading', { name: 'Plan de travail', exact: true })).toBeVisible()
  await expect(preview.getByRole('textbox', { name: /^Détails du projet/ })).toHaveValue(
    'New route answer'
  )
  await page.setViewportSize({ width: 390, height: 844 })
  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main *'))
      .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
      .map((element) => ({
        tag: element.tagName,
        id: element.id,
        className: element.className,
        text: element.textContent?.slice(0, 100),
        right: element.getBoundingClientRect().right
      }))
      .slice(-15)
  )
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    JSON.stringify(overflow)
  ).toBe(true)
  mkdirSync('.agent/visual', { recursive: true })
  const theme = (await page.locator('gcds-header').count()) ? 'gcdesign' : 'nuxtui'
  await preview.screenshot({ path: `.agent/visual/${theme}-survey-flow-fr.png` })
  await preview.getByRole('button', { name: 'Page suivante', exact: true }).click()
  await preview.getByRole('textbox', { name: /^Contact final/ }).fill('contact@example.test')
  await preview.getByRole('button', { name: 'Vérifier les réponses', exact: true }).click()
  await expect(preview.getByText('Les réponses sont valides.', { exact: true })).toBeVisible()
})
