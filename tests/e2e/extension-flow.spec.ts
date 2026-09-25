import { expect, test } from '@playwright/test'

test('extension key publishes a pinned form for an authorized organization', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(120000)
  const adminLogin = await page.request.post('/api/admin/login', {
    data: { email: 'root@example.test', password: 'Root-test-only-2026!' }
  })
  expect(adminLogin.ok()).toBe(true)
  const suffix = Date.now()
  const agency = (
    await (
      await page.request.post('/api/admin/agencies', {
        data: { nameEn: `Extension agency ${suffix}`, nameFr: `Organisme ${suffix}` }
      })
    ).json()
  ).agency
  const key = (
    await (
      await page.request.post('/api/admin/integration-tokens', {
        data: { name: 'Extension', agencyId: agency.id }
      })
    ).json()
  ).token
  const extension = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${key}` }
  })
  const organization = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  try {
    const programResponse = await extension.request.post('/api/government/programs', {
      data: { agencyId: agency.id, nameEn: 'Program', nameFr: 'Programme' }
    })
    expect(programResponse.ok()).toBe(true)
    const program = (await programResponse.json()).program
    const streamResponse = await extension.request.post('/api/government/streams', {
      data: { programId: program.id, nameEn: 'Stream', nameFr: 'Volet' }
    })
    expect(streamResponse.ok()).toBe(true)
    const stream = (await streamResponse.json()).stream
    const surveyResponse = await extension.request.post('/api/government/surveys', {
      data: {
        agencyId: agency.id,
        definition: {
          schemaVersion: 1,
          title: { en: 'Project form', fr: 'Formulaire de projet' },
          attachments: { enabled: false },
          questions: [
            { id: 'project', type: 'text', label: { en: 'Project', fr: 'Projet' }, required: true }
          ]
        }
      }
    })
    expect(surveyResponse.ok()).toBe(true)
    const survey = (await surveyResponse.json()).survey
    const callResponse = await extension.request.post('/api/government/calls', {
      data: {
        streamId: stream.id,
        nameEn: `Funding call ${suffix}`,
        nameFr: `Appel ${suffix}`,
        startDate: '2020-01-01',
        endDate: '2099-12-31'
      }
    })
    expect(callResponse.ok()).toBe(true)
    const call = (await callResponse.json()).id
    expect(
      (
        await extension.request.put(`/api/government/calls/${call}/survey`, {
          data: { surveyId: survey.id, revision: 1 }
        })
      ).ok()
    ).toBe(true)
    expect(
      (
        await extension.request.patch(`/api/government/calls/${call}/publication`, {
          data: { published: true }
        })
      ).ok()
    ).toBe(true)
    const applicant = await organization.newPage()
    const signup = await applicant.request.post('/api/auth/sign-up/email', {
      data: {
        name: 'Extension Applicant',
        email: `extension-applicant-${suffix}@example.test`,
        password: 'Applicant-test-only-2026!'
      }
    })
    expect(signup.ok()).toBe(true)
    const userId = (await (await applicant.request.get('/api/session')).json()).user.id
    const organizationResponse = await applicant.request.post('/api/organizations', {
      data: { name: `Applicant organization ${suffix}` }
    })
    expect(organizationResponse.ok()).toBe(true)
    const organizationId = (await organizationResponse.json()).organization.id
    expect(
      (await applicant.request.get(`/api/organizations/${organizationId}/funding-calls`)).status()
    ).toBe(403)
    expect(
      (
        await applicant.request.patch(`/api/organizations/${organizationId}/members/${userId}`, {
          data: { permissions: ['user', 'admin', 'application:viewer', 'claim:viewer'] }
        })
      ).ok()
    ).toBe(true)
    await applicant.goto(`/organizations/${organizationId}`)
    const workspaceUrl = applicant.url()
    const menu = applicant.locator('gcds-side-nav')
    await expect(menu.getByRole('navigation', { name: /^Manage organization/ })).toBeVisible()
    await menu.getByRole('link', { name: 'Cases and submissions', exact: true }).click()
    await expect(
      applicant.getByRole('heading', { level: 2, name: 'Cases and submissions' })
    ).toBeVisible()
    await expect(
      menu.getByRole('link', { name: 'Cases and submissions', exact: true })
    ).toHaveAttribute('aria-current', 'page')
    await expect(applicant).toHaveURL(`${workspaceUrl}?section=work`)
    await menu.getByRole('link', { name: 'Apply for funding', exact: true }).click()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toBeVisible()
    await expect(
      menu.getByRole('link', { name: 'Apply for funding', exact: true })
    ).toHaveAttribute('aria-current', 'page')
    await expect(applicant).toHaveURL(`${workspaceUrl}?section=funding`)
    await expect(
      applicant.getByRole('region', { name: 'Apply for funding', exact: true })
    ).toBeFocused()
    await applicant.reload()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toBeVisible()
    await applicant.goBack()
    await expect(
      applicant.getByRole('heading', { level: 2, name: 'Cases and submissions' })
    ).toBeVisible()
    await applicant.goForward()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toBeVisible()
    await expect(
      applicant.getByRole('heading', { level: 1, name: `Applicant organization ${suffix}` })
    ).toBeVisible()
    await menu.getByRole('link', { name: 'Overview', exact: true }).click()
    await expect(
      applicant.getByRole('heading', { level: 2, name: 'Overview', exact: true })
    ).toBeVisible()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toHaveCount(0)
    await menu.getByRole('link', { name: 'Apply for funding', exact: true }).click()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toBeVisible()
    await applicant.setViewportSize({ width: 390, height: 844 })
    await menu.getByRole('button', { name: 'Menu', exact: true }).click()
    await menu.getByRole('link', { name: 'Overview', exact: true }).focus()
    await applicant.keyboard.press('Enter')
    await expect(
      applicant.getByRole('heading', { level: 2, name: 'Overview', exact: true })
    ).toBeVisible()
    await menu.getByRole('button', { name: 'Menu', exact: true }).click()
    await menu.getByRole('link', { name: 'Apply for funding', exact: true }).click()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toBeVisible()
    expect(await applicant.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    )
    await applicant.getByRole('link', { name: 'View application form' }).click()
    await expect(applicant.getByRole('heading', { name: 'Project form' })).toBeVisible()
    expect((await applicant.request.get('/api/admin/agencies')).status()).toBe(401)
    expect((await applicant.request.get(`/api/government/agencies/${agency.id}`)).status()).toBe(
      401
    )
  } finally {
    await extension.close()
    await organization.close()
  }
})
