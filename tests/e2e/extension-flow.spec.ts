import { expect, test } from '@playwright/test'

const publicId = (prefix: string) => new RegExp(`^${prefix}-[A-HJKMNP-Z2-9]{5,}$`)
const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i

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
    const createdOrganization = (await organizationResponse.json()).organization
    const organizationCode = createdOrganization.id
    expect(organizationCode).toMatch(/^N-[A-HJKMNP-Z2-9]{5,}$/)
    expect(createdOrganization).not.toHaveProperty('code')
    expect(
      (
        await applicant.request.get('/api/organizations/00000000-0000-7000-8000-000000000001')
      ).status()
    ).toBe(404)
    expect(
      (await applicant.request.get(`/api/organizations/${organizationCode}/funding-calls`)).status()
    ).toBe(403)
    expect(
      (
        await applicant.request.patch(`/api/organizations/${organizationCode}/members/${userId}`, {
          data: {
            permissions: [
              'user',
              'admin',
              'application:viewer',
              'claim:manager',
              'forecast:manager',
              'form:manager'
            ]
          }
        })
      ).ok()
    ).toBe(true)
    const agreementResponse = await extension.request.post('/api/government/agreements', {
      data: {
        organizationId: organizationCode,
        streamId: stream.id,
        nameEn: 'Status agreement',
        nameFr: 'Entente de statut',
        agreementNumber: 'AGR-STATUS',
        active: false,
        status: { en: 'On hold', fr: 'En suspens', colour: '#245A80' },
        config: {
          fiscalYears: [{ id: 'fy', startYear: 2026, foreignSystemId: '91' }],
          budgetLines: [
            {
              id: 'travel',
              fiscalYearId: 'fy',
              foreignSystemId: '92',
              nameEn: 'Travel',
              nameFr: 'Déplacements',
              costCategory: 'Operations',
              costSubsection: 'Travel',
              budgetedAmount: '100.00',
              currency: 'cad'
            }
          ]
        }
      }
    })
    expect(agreementResponse.ok()).toBe(true)
    const createdAgreement = (await agreementResponse.json()).agreement
    expect(createdAgreement.id).toMatch(publicId('A'))
    expect(JSON.stringify(createdAgreement)).not.toMatch(uuid)
    expect(createdAgreement).toMatchObject({
      active: false,
      status: { en: 'On hold', fr: 'En suspens', colour: '#245A80' }
    })
    const setResponse = await extension.request.post('/api/government/sets', {
      data: {
        organizationId: organizationCode,
        agencyId: agency.id,
        agreementId: createdAgreement.id,
        nameEn: 'Agreement progress report',
        nameFr: 'Rapport d’avancement de l’entente',
        items: [{ id: 'project', kind: 'survey', surveyId: survey.id, surveyRevision: 1 }]
      }
    })
    expect(setResponse.ok()).toBe(true)
    const createdSet = (await setResponse.json()).set
    expect(createdSet.id).toMatch(publicId('S'))
    expect(JSON.stringify(createdSet)).not.toMatch(uuid)
    const publication = await extension.request.post(
      `/api/government/sets/${createdSet.id}/publish`,
      {
        data: { expectedRevision: createdSet.revision }
      }
    )
    expect(publication.ok()).toBe(true)
    expect(JSON.stringify(await publication.json())).not.toMatch(uuid)
    for (const kind of ['claim', 'forecast'] as const) {
      const financialSetResponse = await extension.request.post('/api/government/sets', {
        data: {
          organizationId: organizationCode,
          agencyId: agency.id,
          agreementId: createdAgreement.id,
          nameEn: kind === 'claim' ? 'Travel claim' : 'Travel forecast',
          nameFr: kind === 'claim' ? 'Demande de déplacement' : 'Prévision de déplacement',
          items: [{ id: kind, kind, fiscalYearId: 'fy' }]
        }
      })
      expect(financialSetResponse.ok()).toBe(true)
      const financialSet = (await financialSetResponse.json()).set
      expect(financialSet.id).toMatch(publicId('S'))
      expect(
        (
          await extension.request.post(`/api/government/sets/${financialSet.id}/publish`, {
            data: { expectedRevision: financialSet.revision }
          })
        ).ok()
      ).toBe(true)
    }
    const organizationAgreementsResponse = await applicant.request.get(
      `/api/organizations/${organizationCode}/agreements`
    )
    expect(organizationAgreementsResponse.ok()).toBe(true)
    const organizationAgreements = (await organizationAgreementsResponse.json()).agreements
    expect(JSON.stringify(organizationAgreements)).not.toMatch(uuid)
    const rejectedUuid = '00000000-0000-7000-8000-000000000001'
    expect(
      (
        await applicant.request.get(
          `/api/organizations/${organizationCode}/agreements/${rejectedUuid}`
        )
      ).status()
    ).toBe(404)
    expect(
      (
        await applicant.request.get(`/api/organizations/${organizationCode}/sets/${rejectedUuid}`)
      ).status()
    ).toBe(404)
    expect(
      (
        await applicant.request.get(
          `/api/organizations/${organizationCode}/responses/${rejectedUuid}`
        )
      ).status()
    ).toBe(404)
    expect(organizationAgreements).toContainEqual(
      expect.objectContaining({
        nameEn: 'Status agreement',
        agencyNameEn: `Extension agency ${suffix}`,
        agencyNameFr: `Organisme ${suffix}`
      })
    )
    await applicant.goto(`/organizations/${organizationCode}`)
    await expect(
      applicant.locator('dt', { hasText: 'Organization ID' }).locator('..').locator('dd code')
    ).toHaveText(organizationCode)
    const workspaceUrl = applicant.url()
    const menu = applicant.locator('gcds-side-nav')
    await expect(menu.getByRole('navigation', { name: /^Manage organization/ })).toBeVisible()
    await menu.getByRole('link', { name: 'Apply for funding', exact: true }).click()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toBeVisible()
    const fundingSearch = applicant.getByRole('searchbox', { name: 'Search funding calls' })
    await expect(applicant.locator('gcds-search')).toHaveCount(1)
    await fundingSearch.fill('no matching funding call')
    await expect(applicant.getByText('No funding calls match your search.')).toBeVisible()
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toHaveCount(0)
    await applicant.locator('gcds-search').getByRole('button', { name: 'Search' }).click()
    await expect(applicant).toHaveURL(`${workspaceUrl}?section=funding`)
    await fundingSearch.fill('')
    await expect(applicant.getByRole('heading', { name: `Funding call ${suffix}` })).toBeVisible()
    await menu.getByRole('link', { name: 'Agreements', exact: true }).click()
    await expect(applicant.getByRole('heading', { level: 2, name: 'Agreements' })).toBeVisible()
    const agreementSummary = applicant.locator('li.record-summary').filter({
      hasText: 'AGR-STATUS'
    })
    await expect(agreementSummary).toContainText(`Agency: Extension agency ${suffix}`)
    await expect(agreementSummary.locator('.gc-status')).toHaveText(['Inactive', 'On hold'])
    await expect(agreementSummary.locator('.gc-status').last()).toHaveCSS(
      'background-color',
      'rgb(36, 90, 128)'
    )
    await expect(agreementSummary.locator('.gc-status').last()).toHaveCSS(
      'color',
      'rgb(255, 255, 255)'
    )
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    await expect(agreementSummary).toContainText(`Organisme: Organisme ${suffix}`)
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    await agreementSummary.getByRole('link', { name: 'Open agreement: Status agreement' }).click()
    expect(new URL(applicant.url()).pathname).not.toMatch(uuid)
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}`
    )
    await expect(
      applicant.getByRole('heading', { level: 1, name: 'Status agreement' })
    ).toBeVisible()
    await expect(applicant.locator('gcds-breadcrumbs-item')).toHaveText([
      'Home',
      'Your organizations',
      `Applicant organization ${suffix}`,
      'Agreements'
    ])
    await expect(applicant.locator('main').getByRole('link', { name: 'Agreements' })).toHaveCount(0)
    await applicant.reload()
    await expect(applicant.locator('gcds-breadcrumbs-item')).toHaveText([
      'Home',
      'Your organizations',
      `Applicant organization ${suffix}`,
      'Agreements'
    ])
    await expect(applicant.locator('.badges .gc-status').last()).toHaveText('On hold')
    const agreementMenu = applicant.locator('gcds-side-nav')
    await expect(agreementMenu.getByRole('navigation', { name: 'Manage agreement' })).toBeVisible()
    await agreementMenu.getByRole('link', { name: 'Claims', exact: true }).click()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=claims`
    )
    await expect(applicant.getByRole('heading', { level: 2, name: 'Claims' })).toBeVisible()
    await expect(applicant.getByRole('heading', { level: 3, name: 'In Progress' })).toBeVisible()
    await expect(
      applicant.getByRole('heading', { level: 3, name: 'Awaiting Documentation' })
    ).toBeVisible()
    await expect(applicant.getByRole('heading', { level: 3, name: 'Submitted' })).toBeVisible()
    await expect(applicant.locator('gcds-search')).toHaveCount(3)
    await expect(
      applicant.getByRole('searchbox', { name: 'Search submissions — In Progress' })
    ).toBeVisible()
    await expect(
      applicant.getByRole('searchbox', { name: 'Search submissions — Awaiting Documentation' })
    ).toBeVisible()
    await expect(
      applicant.getByRole('searchbox', { name: 'Search submissions — Submitted' })
    ).toBeVisible()
    await applicant.getByRole('button', { name: 'Start new submission' }).click()
    await expect(applicant.getByRole('heading', { level: 1, name: 'Travel claim' })).toBeVisible()
    const claimResponsePath = new URL(applicant.url()).pathname
    expect(claimResponsePath).toMatch(new RegExp(`/responses/C-[A-HJKMNP-Z2-9]{5,}$`))
    await applicant.getByRole('link', { name: 'Back' }).click()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=claims`
    )
    await expect(
      applicant
        .getByRole('region', { name: 'In Progress' })
        .getByRole('table')
        .getByRole('columnheader')
    ).toHaveText(['ID', 'Period start', 'Period end', 'Final claim', 'Status', 'Updated'])
    const claimDraftSection = applicant.getByRole('region', { name: 'In Progress' })
    const claimLink = claimDraftSection.getByRole('link', {
      name: /^C-[A-HJKMNP-Z2-9]{5,}$/
    })
    await expect(claimLink).toBeVisible()
    await expect(claimLink).toHaveAttribute('href', claimResponsePath)
    const claimRow = claimDraftSection.getByRole('row', { name: /^C-[A-HJKMNP-Z2-9]{5,}/ })
    await expect(claimRow.getByRole('cell', { name: 'April', exact: true })).toBeVisible()
    await expect(claimRow.getByRole('cell', { name: 'March', exact: true })).toBeVisible()
    await expect(claimRow.getByRole('cell', { name: 'No', exact: true })).toBeVisible()
    await claimLink.click()
    await expect(applicant).toHaveURL(claimResponsePath)
    await expect(applicant.getByRole('heading', { level: 1, name: 'Travel claim' })).toBeVisible()
    await applicant.getByRole('link', { name: 'Back' }).click()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=claims`
    )
    await agreementMenu.getByRole('link', { name: 'Forecasts', exact: true }).click()
    await expect(applicant.getByRole('heading', { level: 2, name: 'Forecasts' })).toBeVisible()
    await applicant.getByRole('button', { name: 'Start new submission' }).click()
    await expect(
      applicant.getByRole('heading', { level: 1, name: 'Travel forecast' })
    ).toBeVisible()
    const forecastResponsePath = new URL(applicant.url()).pathname
    expect(forecastResponsePath).toMatch(new RegExp(`/responses/F-[A-HJKMNP-Z2-9]{5,}$`))
    await applicant.getByRole('link', { name: 'Back' }).click()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=forecasts`
    )
    await expect(
      applicant
        .getByRole('region', { name: 'In Progress' })
        .getByRole('table')
        .getByRole('columnheader')
    ).toHaveText(['ID', 'Fiscal year', 'Iteration', 'Status', 'Updated'])
    const forecastDraftSection = applicant.getByRole('region', { name: 'In Progress' })
    const forecastLink = forecastDraftSection.getByRole('link', {
      name: /^F-[A-HJKMNP-Z2-9]{5,}$/
    })
    await expect(forecastLink).toBeVisible()
    await expect(forecastLink).toHaveAttribute('href', forecastResponsePath)
    const forecastRow = forecastDraftSection.getByRole('row', {
      name: /^F-[A-HJKMNP-Z2-9]{5,}/
    })
    await expect(forecastRow.getByRole('cell', { name: '2026–27', exact: true })).toBeVisible()
    await expect(forecastRow.getByRole('cell', { name: '1', exact: true })).toBeVisible()
    await forecastLink.click()
    await expect(applicant).toHaveURL(forecastResponsePath)
    await expect(
      applicant.getByRole('heading', { level: 1, name: 'Travel forecast' })
    ).toBeVisible()
    await applicant.getByRole('link', { name: 'Back' }).click()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=forecasts`
    )
    await agreementMenu.getByRole('link', { name: 'Other submissions', exact: true }).click()
    await expect(
      applicant.getByRole('heading', { level: 2, name: 'Other submissions' })
    ).toBeVisible()
    await expect(applicant.getByRole('button', { name: 'Start new submission' })).toBeVisible()
    await agreementMenu.getByRole('link', { name: 'Overview' }).click()
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    await expect(applicant.locator('.badges .gc-status').last()).toHaveText('En suspens')
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    const endpoint = `/api/organizations/${organizationCode}`
    const started = await applicant.request.post(`${endpoint}/sets/${createdSet.id}/responses`, {
      data: { locale: 'en' }
    })
    expect(started.ok()).toBe(true)
    const draft = (await started.json()).response
    expect(draft.id).toMatch(publicId('K'))
    expect(JSON.stringify(draft)).not.toMatch(uuid)
    await agreementMenu.getByRole('link', { name: 'Other submissions', exact: true }).click()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=other`
    )
    await applicant.reload()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=other`
    )
    await expect(
      applicant.getByRole('heading', { level: 2, name: 'Other submissions' })
    ).toBeVisible()
    const otherDraftSection = applicant.getByRole('region', { name: 'In Progress' })
    const otherDraftLink = otherDraftSection.getByRole('link', {
      name: /^K-[A-HJKMNP-Z2-9]{5,}$/
    })
    await expect(otherDraftLink).toBeVisible()
    await expect(otherDraftLink).toHaveAttribute(
      'href',
      `/organizations/${organizationCode}/responses/${draft.id}`
    )
    const otherFormCell = otherDraftSection.getByRole('cell', {
      name: /^K-[A-HJKMNP-Z2-9]{5,}\s+Agreement progress report$/
    })
    await expect(otherFormCell).toBeVisible()
    const saved = await applicant.request.put(`${endpoint}/responses/${draft.id}`, {
      data: {
        expectedRevision: draft.revision,
        items: [{ id: 'project', kind: 'survey', answers: { project: 'A community project' } }]
      }
    })
    expect(saved.ok()).toBe(true)
    const savedResponse = (await saved.json()).response
    const checked = await applicant.request.post(`${endpoint}/responses/${draft.id}/check`, {
      data: { expectedRevision: savedResponse.revision }
    })
    expect(checked.ok()).toBe(true)
    const submitted = await applicant.request.post(`${endpoint}/responses/${draft.id}/submit`, {
      data: {
        expectedRevision: savedResponse.revision,
        balanceRevision: null,
        warningsAcknowledged: true
      }
    })
    expect(submitted.ok()).toBe(true)
    const submission = (await submitted.json()).response
    expect(submission.submissionId).toMatch(publicId('K'))
    const statusChange = await extension.request.put(
      `/api/government/submissions/${submission.submissionId}/status`,
      {
        data: {
          expectedRevision: submission.revision,
          status: 'awaiting_documentation',
          gcsStatus: { en: 'Receipt needed', fr: 'Reçu requis', colour: '#245A80' }
        }
      }
    )
    expect(statusChange.ok()).toBe(true)
    const awaiting = (await statusChange.json()).response
    await applicant.reload()
    const awaitingSection = applicant.getByRole('region', { name: 'Awaiting Documentation' })
    const awaitingTable = awaitingSection.getByRole('table')
    await expect(awaitingTable.getByRole('columnheader')).toHaveText(['Form', 'Status', 'Updated'])
    await expect(awaitingTable.getByRole('cell', { name: 'Receipt needed' })).toBeVisible()
    await expect(awaitingTable.getByText('Awaiting documentation')).toHaveCount(0)
    await awaitingSection.getByRole('searchbox').fill('does not match')
    await expect(awaitingSection.getByText('No matching submissions.')).toBeVisible()
    await awaitingSection.getByRole('searchbox').fill('Receipt needed')
    await expect(awaitingSection.getByText('Receipt needed')).toBeVisible()
    const awaitingLink = awaitingSection.getByRole('link', { name: /^K-[A-HJKMNP-Z2-9]{5,}$/ })
    await expect(awaitingLink).toHaveAttribute(
      'href',
      `/organizations/${organizationCode}/responses/${draft.id}`
    )
    await awaitingLink.click()
    await expect(
      applicant.getByRole('heading', { level: 2, name: 'Additional documentation' })
    ).toBeVisible()
    const uploaded = await applicant.request.post(
      `${endpoint}/responses/${draft.id}/items/!documentation/attachments?filename=receipt.txt&expectedRevision=${awaiting.revision}`,
      {
        data: Buffer.from('Example receipt'),
        headers: { 'Content-Type': 'application/octet-stream' }
      }
    )
    expect(uploaded.ok()).toBe(true)
    await applicant.reload()
    await expect(applicant.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=other`
    )
    await expect(applicant.getByRole('link', { name: 'receipt.txt' })).toBeVisible()
    await applicant.getByLabel('Message').fill('The requested receipt is attached.')
    await applicant.getByRole('button', { name: 'Send additional details' }).click()
    await expect(
      applicant
        .getByRole('region', { name: 'Additional documentation' })
        .locator('ul.organization-list')
        .getByText('The requested receipt is attached.')
    ).toBeVisible()
    const governmentView = await extension.request.get(
      `/api/government/submissions/${submission.submissionId}/response`
    )
    expect(governmentView.ok()).toBe(true)
    expect((await governmentView.json()).details).toMatchObject([
      { body: 'The requested receipt is attached.', attachmentIds: [expect.any(String)] }
    ])
    await applicant.getByRole('link', { name: 'Back' }).click()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=other`
    )
    await expect(
      applicant
        .getByRole('region', { name: 'Awaiting Documentation' })
        .getByRole('link', { name: /^K-[A-HJKMNP-Z2-9]{5,}$/ })
    ).toBeVisible()
    await applicant.reload()
    await expect(applicant).toHaveURL(
      `/organizations/${organizationCode}/agreements/${createdAgreement.id}?section=other`
    )
    await expect(applicant.locator('gcds-breadcrumbs-item')).toHaveText([
      'Home',
      'Your organizations',
      `Applicant organization ${suffix}`,
      'Agreements'
    ])
    await applicant.locator('gcds-breadcrumbs-item').last().getByRole('link').click()
    await expect(menu.getByRole('link', { name: 'Agreements', exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(applicant).toHaveURL(`${workspaceUrl}?section=agreements`)
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
    await expect(applicant.getByRole('heading', { level: 2, name: 'Agreements' })).toBeVisible()
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
