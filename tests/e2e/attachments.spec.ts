import { test, expect, type Page } from '@playwright/test'
const select = async (page: Page, name: RegExp, label: string) => {
  const field = page.getByRole('combobox', { name })
  if (await field.evaluate((element) => element.tagName === 'SELECT'))
    await field.selectOption({ label })
  else {
    await field.click()
    await page.getByRole('option', { name: label, exact: true }).click()
  }
}
test('application drafts and private S3 attachments work from authoring through manager submission', async ({
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
  const names = { nameEn: 'Attachment agency', nameFr: 'Agence des pièces jointes' }
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
      await page.request.post('/api/government/streams', { data: { ...names, programId } })
    ).json()
  ).stream.id
  await page.goto(`/government/surveys/new?agencyId=${agencyId}`)
  await page.getByLabel(/^Form title in English/).fill('Application with evidence')
  await page.getByLabel(/^Form title in French/).fill('Demande avec pièces justificatives')
  await select(page, /^Allow attachments/, 'Yes')
  await page.getByRole('button', { name: 'Add question', exact: true }).click()
  await page.getByLabel(/^Question in English/).fill('Project name')
  await page.getByLabel(/^Question in French/).fill('Nom du projet')
  await select(page, /^Response requirement/, 'Required')
  await page.getByRole('button', { name: 'Apply question changes', exact: true }).click()
  await page.getByRole('button', { name: 'Add question', exact: true }).click()
  await select(page, /^Control/, 'Number')
  await page.getByLabel(/^Question in English/).fill('Previous awards')
  await page.getByLabel(/^Question in French/).fill('Subventions précédentes')
  await page.getByRole('button', { name: 'Apply question changes', exact: true }).click()
  await page.getByRole('button', { name: 'Save form revision', exact: true }).click()
  await expect(page).toHaveURL(/\/government\/surveys\/[0-9a-f-]{36}$/)
  const surveyId = page.url().split('/').at(-1)!
  const callId = (
    await (
      await page.request.post('/api/government/calls', {
        data: { ...names, streamId, startDate: '2020-01-01', endDate: '2099-12-31' }
      })
    ).json()
  ).id
  expect(
    (
      await page.request.put(`/api/government/calls/${callId}/survey`, {
        data: { surveyId, revision: 1 }
      })
    ).ok()
  ).toBe(true)
  expect(
    (
      await page.request.patch(`/api/government/calls/${callId}/publication`, {
        data: { published: true }
      })
    ).ok()
  ).toBe(true)
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  const applicant = await context.newPage()
  applicant.on('pageerror', (error) => errors.push(error.message))
  try {
    expect(
      (
        await applicant.request.post('/api/auth/sign-up/email', {
          data: {
            name: 'Application owner',
            email: `files-${Date.now()}@example.test`,
            password: 'Applicant-test-only-2026!'
          }
        })
      ).ok()
    ).toBe(true)
    const userId = (await (await applicant.request.get('/api/session')).json()).user.id
    const orgId = (
      await (
        await applicant.request.post('/api/organizations', {
          data: { name: 'Evidence organization' }
        })
      ).json()
    ).organization.id
    const permissions = async (level: string) =>
      expect(
        (
          await applicant.request.patch(`/api/organizations/${orgId}/members/${userId}`, {
            data: { permissions: ['user', 'admin', `application:${level}`] }
          })
        ).ok()
      ).toBe(true)
    await permissions('contributor')
    await applicant.goto(`/funding/${orgId}`)
    await applicant.getByRole('button', { name: 'Start application', exact: true }).click()
    await expect(applicant).toHaveURL(/\/responses\/[0-9a-f-]{36}$/)
    const responseId = applicant.url().split('/').at(-1)!,
      endpoint = `/api/organizations/${orgId}/responses/${responseId}`
    await applicant.getByLabel(/^Project name/).fill('Community project')
    // Another editor advances the revision while this browser has unsaved answers.
    const initial = await (await applicant.request.get(endpoint)).json()
    const questionId = initial.response.snapshot.items[0].survey.questions[0].id
    expect(
      (
        await applicant.request.put(endpoint, {
          data: {
            expectedRevision: 1,
            items: [
              { id: 'application', kind: 'survey', answers: { [questionId]: 'Saved earlier' } }
            ]
          }
        })
      ).ok()
    ).toBe(true)
    await applicant.getByLabel(/^Choose a file/).setInputFiles({
      name: 'conflict.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Conflict test')
    })
    await applicant.getByRole('button', { name: 'Upload file', exact: true }).click()
    await expect(
      applicant.getByRole('button', { name: 'Reload response', exact: true })
    ).toBeVisible()
    applicant.once('dialog', (dialog) => dialog.dismiss())
    await applicant.getByRole('button', { name: 'Reload response', exact: true }).click()
    await expect(applicant.getByLabel(/^Project name/)).toHaveValue('Community project')
    applicant.once('dialog', (dialog) => dialog.accept())
    await applicant.getByRole('button', { name: 'Reload response', exact: true }).click()
    await expect(applicant.getByLabel(/^Project name/)).toHaveValue('Saved earlier')
    await applicant.getByLabel(/^Project name/).fill('Community project')

    await applicant.getByLabel(/^Choose a file/).setInputFiles({
      name: 'evidence.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Private project evidence')
    })
    await applicant.getByRole('button', { name: 'Upload file', exact: true }).click()
    await expect(applicant.getByRole('link', { name: /^evidence\.txt/ })).toBeVisible()
    // File mutations update CAS without discarding unsaved answers.
    await expect(applicant.getByLabel(/^Project name/)).toHaveValue('Community project')
    await applicant.getByLabel(/^Previous awards/).fill('0')
    await applicant.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(applicant.getByText('Changes saved.', { exact: true })).toBeVisible()
    const result = await (await applicant.request.get(endpoint)).json(),
      file = result.attachments[0]
    const download = await applicant.request.get(`${endpoint}/attachments/${file.id}`)
    expect(await download.text()).toBe('Private project evidence')
    expect(download.headers()['content-disposition']).toContain('attachment;')
    expect(download.headers()['content-type']).toBe('application/octet-stream')
    expect((await page.request.get(`${endpoint}/attachments/${file.id}`)).status()).toBe(403)
    expect(
      (
        await page.request.get(`http://127.0.0.1:3199/portal-test/portal-attachments/${file.id}`)
      ).status()
    ).toBe(403)
    await expect(
      applicant.getByRole('button', { name: 'Review and submit', exact: true })
    ).toHaveCount(0)
    await permissions('viewer')
    await applicant.reload()
    await expect(applicant.getByRole('link', { name: /^evidence\.txt/ })).toBeVisible()
    await expect(applicant.getByRole('button', { name: 'Upload file', exact: true })).toHaveCount(0)
    expect(
      (
        await applicant.request.delete(`${endpoint}/attachments/${file.id}`, {
          data: { expectedRevision: result.response.revision }
        })
      ).status()
    ).toBe(403)
    await permissions('manager')
    await applicant.reload()
    await applicant.getByRole('button', { name: 'Remove file — evidence.txt', exact: true }).click()
    await expect(applicant.getByRole('link', { name: /^evidence\.txt/ })).toHaveCount(0)
    await applicant.getByLabel(/^Choose a file/).setInputFiles({
      name: 'final.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Final evidence')
    })
    await applicant.getByRole('button', { name: 'Upload file', exact: true }).click()
    await expect(applicant.getByRole('link', { name: /^final\.txt/ })).toBeVisible()
    await applicant.getByRole('button', { name: 'Review and submit', exact: true }).click()
    await applicant.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    await expect(
      applicant.getByText('This submission is final and cannot be edited.', { exact: true })
    ).toBeVisible()
    const final = await (await applicant.request.get(endpoint)).json()
    await page.goto(`/government/cases?agencyId=${agencyId}`)
    await page.getByRole('link', { name: 'Attachment agency', exact: true }).click()
    await expect(page.getByText(/Evidence organization/)).toBeVisible()
    await expect(page.getByText('Community project', { exact: true })).toBeVisible()
    await expect(page.getByRole('definition').filter({ hasText: /^0$/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /^final\.txt/ })).toBeVisible()
    const govDownload = await page.request.get(
      `/api/government/submissions/${final.response.submissionId}/attachments/${final.attachments[0].id}`
    )
    expect(await govDownload.text()).toBe('Final evidence')
    await applicant.goto(`/funding/${orgId}`)
    await expect(
      applicant.getByRole('link', { name: 'Attachment agency — Submitted', exact: true })
    ).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await page.request.patch(`/api/government/calls/${callId}/publication`, {
      data: { published: false }
    })
    await context.close()
  }
})
