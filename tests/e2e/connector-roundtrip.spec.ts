import { signUpApplicant } from '../fixtures/signup'
import { expect, test } from '@playwright/test'

test('published funding and organization forms produce queue exports and display GCS outcomes', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(120_000)
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
            definition: {
              schemaVersion: 1,
              title: { en: 'Roundtrip form', fr: 'Formulaire aller-retour' },
              attachments: { enabled: false },
              questions: [
                {
                  id: 'project',
                  type: 'text',
                  label: { en: 'Project title', fr: 'Titre du projet' },
                  required: true
                }
              ]
            }
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
    await applicant.goto(`/organizations/${organization.id}?section=funding`)
    await expect(applicant.getByText('Verified', { exact: true })).toBeVisible()
    const funding = applicant
      .locator('.record-summary')
      .filter({ has: applicant.getByRole('heading', { name: `Roundtrip funding ${suffix}` }) })
    await funding.getByRole('button', { name: 'Start application', exact: true }).click()
    const submissionIds: string[] = []
    for (const kind of ['application', 'organization'] as const) {
      if (kind === 'organization') {
        await applicant.goto(`/organizations/${organization.id}/sets/${set.id}`)
        await applicant
          .getByRole('button', { name: 'Start or continue draft', exact: true })
          .click()
      }
      await applicant.waitForLoadState('networkidle')
      const field = applicant.getByRole('textbox', { name: 'Project title', exact: true })
      await expect(field).toHaveAttribute('required', '')
      await field.fill(`${kind} preserved applicant text`)
      await Promise.all([
        applicant.waitForResponse(
          (response) =>
            response.request().method() === 'PUT' && response.url().includes('/responses/')
        ),
        applicant.getByRole('button', { name: 'Save draft', exact: true }).click()
      ])
      await applicant.getByRole('button', { name: 'Submit', exact: true }).click()
      await applicant.getByRole('button', { name: 'Confirm submission', exact: true }).click()
      await expect(applicant.getByText('Submitted', { exact: true })).toBeVisible()
      const submissionId = applicant.url().split('/').at(-1)!
      submissionIds.push(submissionId)
      const immutable = (
        await (await integration.request.get(`/api/government/submissions/${submissionId}`)).json()
      ).submission
      expect(immutable.items[0].answers.project).toBe(`${kind} preserved applicant text`)
      if (kind === 'application') {
        expect(immutable.application.foreignSystemId).toBe('501')
        expect(immutable.application.externalStreamId).toBe('301')
      }
      const events = (
        await (
          await integration.request.get(`/api/government/agencies/${agency.id}/updates`)
        ).json()
      ).updates
      const event = events.find(
        (entry: { submissionId: string }) => entry.submissionId === submissionId
      )
      expect(event).toBeDefined()
      expect(
        (
          await integration.request.put(
            `/api/government/submissions/${submissionId}/items/${immutable.items[0].itemSubmissionId}/outcome`,
            {
              data: {
                expectedRevision: 0,
                remoteReference: kind === 'application' ? '701' : '702',
                gcsStatus: null
              }
            }
          )
        ).ok()
      ).toBe(true)
      expect(
        (
          await integration.request.post(
            `/api/government/agencies/${agency.id}/updates/${event.eventId}/consume`,
            {
              data: { remoteReference: kind === 'application' ? '701' : '702' }
            }
          )
        ).ok()
      ).toBe(true)
      await applicant.reload()
      await expect(
        applicant.getByText(`GCS reference: ${kind === 'application' ? '701' : '702'}`, {
          exact: true
        })
      ).toBeVisible()
      await expect(
        applicant.getByText(`${kind} preserved applicant text`, { exact: true })
      ).toBeVisible()
      const after = (
        await (await integration.request.get(`/api/government/submissions/${submissionId}`)).json()
      ).submission
      expect(after).toEqual(immutable)
    }
    const remaining = (
      await (await integration.request.get(`/api/government/agencies/${agency.id}/updates`)).json()
    ).updates
    expect(
      remaining.filter((entry: { submissionId: string }) =>
        submissionIds.includes(entry.submissionId)
      )
    ).toHaveLength(0)
  } finally {
    await integration.close()
    await applicantContext.close()
  }
})
