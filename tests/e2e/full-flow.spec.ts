import { expect, test, type Page, type Locator } from '@playwright/test'

const password = 'Full-journey-test-only-2026!'
const select = async (page: Page, field: Locator, label: string) => {
  if (await field.evaluate((element) => element.tagName === 'SELECT'))
    await field.selectOption({ label })
  else {
    await field.click()
    await page.getByRole('option', { name: label, exact: true }).click()
  }
}
const register = async (page: Page, name: string, email: string) => {
  await page.getByLabel(/^Full name/).fill(name)
  await page.getByLabel(/^Email address/).fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByLabel(/^Confirm password/).fill(password)
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
}

test('full UI journey: invited contributor applies; manager submits; invited staff receives evidence', async ({
  browser,
  baseURL
}) => {
  test.setTimeout(180000)
  // Respect the real shared-IP authentication limiter between independent journeys.
  await new Promise((resolve) => setTimeout(resolve, 11000))
  const contexts = await Promise.all(
    Array.from({ length: 4 }, () => browser.newContext({ baseURL, ignoreHTTPSErrors: true }))
  )
  const [owner, member, root, staff] = (await Promise.all(
    contexts.map((context) => context.newPage())
  )) as [Page, Page, Page, Page]
  const errors: string[] = []
  for (const page of [owner, member, root, staff])
    page.on('pageerror', (error) => errors.push(error.message))
  const suffix = Date.now()
  const memberEmail = `journey-member-${suffix}@example.test`
  const staffEmail = `journey-staff-${suffix}@example.test`
  try {
    await test.step('Register organization owner and invite a colleague', async () => {
      await owner.goto('/register')
      await register(owner, 'Journey Owner', `journey-owner-${suffix}@example.test`)
      await expect(owner).toHaveURL(/\/organizations\/new$/)
      await owner.getByLabel(/^Organization name/).fill('Journey organization')
      await owner.getByRole('button', { name: 'Create organization', exact: true }).click()
      await expect(
        owner.getByRole('heading', { name: 'Journey organization', exact: true })
      ).toBeVisible()
      await owner.getByRole('button', { name: 'Invitations', exact: true }).click()
      await owner.getByLabel(/^Email address/).fill(memberEmail)
      await owner.getByLabel(/^Full name/).fill('Journey Member')
      await owner.getByRole('button', { name: 'Create invitation link' }).click()
      await expect(owner.getByLabel(/^Invitation link/)).toHaveValue(/\/invitations\//)
      await member.goto(await owner.getByLabel(/^Invitation link/).inputValue())
      await member.getByRole('link', { name: 'Create an account to join' }).click()
      await register(member, 'Journey Member', memberEmail)
      await member.getByRole('button', { name: 'Accept invitation', exact: true }).click()
      await expect(
        member.getByRole('heading', { name: 'Journey organization', exact: true })
      ).toBeVisible()
      await expect(
        member.getByRole('link', { name: 'Apply for funding', exact: true })
      ).toHaveCount(0)
    })
    const organizationUrl = member.url()
    const organizationId = organizationUrl.split('/').at(-1)!
    await test.step('Grant distinct contributor and manager access through People', async () => {
      await owner.getByRole('button', { name: 'People', exact: true }).click()
      for (const [person, level] of [
        ['Journey Owner', 'Manager'],
        ['Journey Member', 'Contributor']
      ]) {
        const row = owner.getByRole('row').filter({ hasText: person })
        for (const subject of ['Applications', 'Claims', 'Forecasts', 'Standalone forms']) {
          const saved = owner.waitForResponse(
            (response) =>
              response.url().includes('/members/') && response.request().method() === 'PATCH'
          )
          await select(owner, row.getByRole('combobox', { name: subject, exact: true }), level!)
          expect((await saved).ok()).toBe(true)
        }
      }
    })
    await test.step('Root invites an independent government officer', async () => {
      await root.goto('/government/login')
      await root.getByLabel(/^Email address/).fill('root@example.test')
      await root.getByLabel(/^Password/).fill('Root-test-only-2026!')
      await root.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(root).toHaveURL(/\/government$/)
      await root.getByRole('link', { name: 'Government staff', exact: true }).click()
      await root.getByLabel(/^Full name/).fill('Journey Officer')
      await root.getByLabel(/^Email address/).fill(staffEmail)
      await root.getByRole('button', { name: 'Create invitation', exact: true }).click()
      await expect(root.getByLabel(/^Invitation link/)).toHaveValue(/\/government\/invitations\//)
      await staff.goto(await root.getByLabel(/^Invitation link/).inputValue())
      await staff.getByRole('link', { name: 'Create an account to join' }).click()
      await register(staff, 'Journey Officer', staffEmail)
      await staff.getByRole('button', { name: 'Accept invitation', exact: true }).click()
      await expect(staff).toHaveURL(/\/government$/)
    })
    await test.step('Officer creates agency, program and stream', async () => {
      await staff.getByLabel(/^Name in English/).fill('Journey agency')
      await staff.getByLabel(/^Name in French/).fill('Organisme du parcours')
      await staff.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(staff.getByRole('heading', { level: 1, name: 'Journey agency' })).toBeVisible()
      await staff.getByLabel(/^Name in English/).fill('Journey program')
      await staff.getByLabel(/^Name in French/).fill('Programme du parcours')
      await staff.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(
        staff.getByRole('button', { name: 'Edit Journey program', exact: true })
      ).toBeVisible()
      await staff.getByRole('button', { name: 'Streams', exact: true }).click()
      await select(staff, staff.getByRole('combobox', { name: /^Program/ }), 'Journey program')
      await staff.getByLabel(/^Name in English/).fill('Journey stream')
      await staff.getByLabel(/^Name in French/).fill('Volet du parcours')
      await staff.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(
        staff.getByRole('button', { name: 'Edit Journey stream', exact: true })
      ).toBeVisible()
    })
    const agencyUrl = staff.url()
    const agencyId = agencyUrl.split('/').at(-1)!
    await test.step('Design a bilingual application with attachments and publish its call', async () => {
      await staff.goto(`/government/surveys/new?agencyId=${agencyId}`)
      await staff.getByLabel(/^Form title in English/).fill('Journey application')
      await staff.getByLabel(/^Form title in French/).fill('Demande du parcours')
      await select(staff, staff.getByRole('combobox', { name: /^Allow attachments/ }), 'Yes')
      await staff.getByRole('button', { name: 'Add question', exact: true }).click()
      await staff.getByLabel(/^Question in English/).fill('Project summary')
      await staff.getByLabel(/^Question in French/).fill('Résumé du projet')
      await select(
        staff,
        staff.getByRole('combobox', { name: /^Response requirement/ }),
        'Required'
      )
      await staff.getByRole('button', { name: 'Apply question changes', exact: true }).click()
      await staff.getByRole('button', { name: 'Save form revision', exact: true }).click()
      await expect(staff).toHaveURL(/\/government\/surveys\/[0-9a-f-]{36}$/)
      await staff.goto(agencyUrl)
      await staff.getByRole('button', { name: 'Calls for proposals', exact: true }).click()
      await select(
        staff,
        staff.getByRole('combobox', { name: /^Stream/ }),
        'Journey program — Journey stream'
      )
      await staff.getByLabel(/^Name in English/).fill('Journey call')
      await staff.getByLabel(/^Name in French/).fill('Appel du parcours')
      await staff.getByLabel(/^Start date/).fill('2020-01-01')
      await staff.getByLabel(/^End date/).fill('2099-12-31')
      await staff.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(staff.getByRole('cell', { name: 'Draft', exact: true })).toBeVisible()
      await select(
        staff,
        staff.getByRole('combobox', { name: /^Application form/ }),
        'Journey application (Revision 1)'
      )
      await staff.getByRole('button', { name: 'Attach revision', exact: true }).click()
      await expect(staff.getByText(/Attached revision 1/)).toBeVisible()
      await staff.getByRole('button', { name: 'Publish', exact: true }).click()
      await staff.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(staff.getByRole('cell', { name: 'Published', exact: true })).toBeVisible()
    })
    await test.step('Invited contributor saves evidence; only the manager submits', async () => {
      await member.goto(organizationUrl)
      await member.getByRole('link', { name: 'Apply for funding', exact: true }).click()
      await member.getByRole('button', { name: 'Start application', exact: true }).click()
      await expect(member).toHaveURL(/\/responses\/[0-9a-f-]{36}$/)
      await member.getByLabel(/^Project summary/).fill('A complete browser journey')
      await member.getByLabel(/^Choose a file/).setInputFiles({
        name: 'journey.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Journey evidence')
      })
      await member.getByRole('button', { name: 'Upload file', exact: true }).click()
      await expect(member.getByRole('link', { name: /^journey\.txt/ })).toBeVisible()
      await member.getByRole('button', { name: 'Save draft', exact: true }).click()
      await expect(member.getByText('Changes saved.', { exact: true })).toBeVisible()
      await expect(
        member.getByRole('button', { name: 'Review and submit', exact: true })
      ).toHaveCount(0)
      await owner.goto(member.url())
      await expect(owner.getByLabel(/^Project summary/)).toHaveValue('A complete browser journey')
      await owner.getByRole('button', { name: 'Review and submit', exact: true }).click()
      await owner.getByRole('button', { name: 'Confirm submission', exact: true }).click()
      await expect(
        owner.getByText('This submission is final and cannot be edited.', { exact: true })
      ).toBeVisible()
      await member.reload()
      await expect(member.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0)
    })
    await test.step('Officer receives the submitted answers and exact evidence bytes', async () => {
      await staff.goto(`/government/cases?agencyId=${agencyId}`)
      await staff.getByRole('link', { name: 'Journey call', exact: true }).click()
      await expect(staff.getByText(/Journey organization/)).toBeVisible()
      await expect(staff.getByText('A complete browser journey', { exact: true })).toBeVisible()
      const download = staff.waitForEvent('download')
      await staff.getByRole('link', { name: /^journey\.txt/ }).click()
      const evidence = await download
      expect(evidence.suggestedFilename()).toBe('journey.txt')
      const stream = await evidence.createReadStream()
      const chunks: Buffer[] = []
      for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
      expect(Buffer.concat(chunks).toString()).toBe('Journey evidence')
      // Withdraw our call through the UI so later independent journeys see no open calls.
      await staff.goto(agencyUrl)
      await staff.getByRole('button', { name: 'Calls for proposals', exact: true }).click()
      await staff.getByRole('button', { name: 'Unpublish', exact: true }).click()
      await staff.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(staff.getByRole('cell', { name: 'Draft', exact: true })).toBeVisible()
    })

    await test.step('Officer publishes an ordered survey, claim, forecast and survey package', async () => {
      await staff.goto(`/government/cases/new?agencyId=${agencyId}`)
      await staff.getByLabel(/^Name in English/).fill('Journey agreement')
      await staff.getByLabel(/^Name in French/).fill('Entente du parcours')
      await staff.getByLabel(/^Organization ID/).fill(organizationId)
      await select(staff, staff.getByRole('combobox', { name: /^Stream/ }), 'Journey stream')
      await staff.getByLabel(/^Agreement number/).fill('JOURNEY-2026')
      await staff.getByLabel(/^Foreign system ID/).fill('10001')
      await staff.getByLabel(/^GCS–SSC stream ID/).fill('10002')
      await staff.getByRole('button', { name: 'Add fiscal year', exact: true }).click()
      await staff.getByLabel(/^Fiscal year starting in April/).fill('2026')
      await staff
        .getByRole('group', { name: 'Fiscal year 1', exact: true })
        .getByLabel(/^Foreign system ID/)
        .fill('10003')
      await staff.getByRole('button', { name: 'Add budget line', exact: true }).click()
      const budget = staff.getByRole('group', { name: 'Budget lines 1', exact: true })
      for (const [label, value] of [
        [/^Name in English/, 'Travel'],
        [/^Name in French/, 'Déplacements'],
        [/^Cost category/, 'Operations'],
        [/^Cost subsection/, 'Travel'],
        [/^Foreign system ID/, '9007199254740993'],
        [/^Budgeted amount/, '200.00'],
        [/^Remaining balance/, '100.00'],
        [/^Balance as of/, '2026-09-19T00:00:00Z']
      ] as const)
        await budget.getByLabel(label).fill(value)
      await staff.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(staff).toHaveURL(/\/government\/cases\/[0-9a-f-]{36}\?/)
      await staff.goto(`/government/sets/new?agencyId=${agencyId}`)
      await select(
        staff,
        staff.getByRole('combobox', { name: /^Publish under/ }),
        'Journey agreement'
      )
      await staff.getByLabel(/^Name in English/).fill('Journey financial package')
      await staff.getByLabel(/^Name in French/).fill('Dossier financier du parcours')
      for (const [index, kind] of [
        'Designed form',
        'Claims',
        'Forecasts',
        'Designed form'
      ].entries()) {
        await staff.getByRole('button', { name: 'Add item', exact: true }).click()
        const item = staff.getByRole('group', { name: `Item ${index + 1}`, exact: true })
        await select(staff, item.getByRole('combobox', { name: /^Item type/ }), kind)
        if (kind === 'Designed form')
          await select(
            staff,
            item.getByRole('combobox', { name: /^Designed form/ }),
            'Journey application'
          )
        else await select(staff, item.getByRole('combobox', { name: /^Allow attachments/ }), 'Yes')
      }
      await staff.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(staff).toHaveURL(/\/government\/sets\/[0-9a-f-]{36}\?/)
      await staff.getByRole('button', { name: 'Publish', exact: true }).click()
      await expect(
        staff.getByRole('button', { name: 'Withdraw publication', exact: true })
      ).toBeVisible()
    })
    await test.step('Contributor drafts all ordered items; manager acknowledges a balance warning', async () => {
      await member.goto(`/organizations/${organizationId}/work`)
      await member
        .locator('li')
        .filter({ hasText: 'Journey financial package' })
        .getByRole('button', { name: 'Start or continue draft' })
        .click()
      await expect(member).toHaveURL(/\/responses\/[0-9a-f-]{36}$/)
      await member.getByLabel(/^Project summary/).fill('Before financial forms')
      await member.getByRole('button', { name: 'Next item', exact: true }).click()
      await member.getByLabel(/^Amount/).fill('125.50')
      await member.getByLabel(/^Choose a file/).setInputFiles({
        name: 'claim.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Claim evidence')
      })
      let releaseUpload!: () => void
      const uploadGate = new Promise<void>((resolve) => {
        releaseUpload = resolve
      })
      const uploadRoute = '**/items/*/attachments?*'
      await member.route(uploadRoute, async (route) => {
        await uploadGate
        await route.continue()
      })
      try {
        await member.getByRole('button', { name: 'Upload file', exact: true }).click()
        await expect(member.getByRole('button', { name: 'Next item', exact: true })).toBeDisabled()
        await expect(
          member.getByRole('button', { name: 'Previous item', exact: true })
        ).toBeDisabled()
      } finally {
        releaseUpload()
      }
      await expect(member.getByRole('link', { name: /^claim\.txt/ })).toBeVisible()
      await member.unroute(uploadRoute)
      await member.getByRole('button', { name: 'Next item', exact: true }).click()
      await member
        .getByRole('button', { name: 'Fill blank amounts with zero', exact: true })
        .click()
      await member.getByLabel(/^April/).fill('25.00')
      await member.getByRole('button', { name: 'Next item', exact: true }).click()
      await member.getByLabel(/^Project summary/).fill('After financial forms')
      await member.getByRole('button', { name: 'Save draft', exact: true }).click()
      await expect(member.getByText('Changes saved.', { exact: true })).toBeVisible()
      await expect(
        member.getByRole('button', { name: 'Review and submit', exact: true })
      ).toHaveCount(0)
      await owner.goto(member.url())
      await owner.getByRole('button', { name: 'Review and submit', exact: true }).click()
      await expect(
        owner.getByText(/The requested amount exceeds the reported balance/)
      ).toBeVisible()
      await owner.getByRole('button', { name: 'Confirm submission', exact: true }).click()
      await expect(
        owner.getByText('This submission is final and cannot be edited.', { exact: true })
      ).toBeVisible()
      await staff.goto(`/government/cases?agencyId=${agencyId}`)
      await staff
        .getByRole('link', { name: 'Journey financial package', exact: true })
        .and(staff.locator('a[href^="/government/submissions/"]'))
        .click()
      await expect(staff.getByText('Before financial forms', { exact: true })).toBeVisible()
      await expect(staff.getByText('After financial forms', { exact: true })).toBeVisible()
      await expect(staff.getByRole('link', { name: /^claim\.txt/ })).toBeVisible()
      await expect(staff.getByLabel(/^Amount/)).toHaveValue('125.50')
      await expect(staff.getByLabel(/^April/)).toHaveValue('25.00')
    })
    await test.step('Publish, complete and receive a standalone organization form', async () => {
      await staff.goto(`/government/sets/new?agencyId=${agencyId}`)
      await staff.getByLabel(/^Organization ID/).fill(organizationId)
      await staff.getByLabel(/^Name in English/).fill('Journey follow-up')
      await staff.getByLabel(/^Name in French/).fill('Suivi du parcours')
      await staff.getByRole('button', { name: 'Add item', exact: true }).click()
      await select(
        staff,
        staff.getByRole('combobox', { name: /^Designed form/ }),
        'Journey application'
      )
      await staff.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(staff).toHaveURL(/\/government\/sets\/[0-9a-f-]{36}\?/)
      await staff.getByRole('button', { name: 'Publish', exact: true }).click()
      await expect(
        staff.getByRole('button', { name: 'Withdraw publication', exact: true })
      ).toBeVisible()
      await member.goto(`/organizations/${organizationId}/work`)
      await member
        .locator('li')
        .filter({ hasText: 'Journey follow-up' })
        .getByRole('button', { name: 'Start or continue draft' })
        .click()
      await expect(member).toHaveURL(/\/responses\/[0-9a-f-]{36}$/)
      await member.getByLabel(/^Project summary/).fill('Organization follow-up completed')
      await member.getByRole('button', { name: 'Save draft', exact: true }).click()
      await expect(member.getByText('Changes saved.', { exact: true })).toBeVisible()
      await owner.goto(member.url())
      await owner.getByRole('button', { name: 'Review and submit', exact: true }).click()
      await owner.getByRole('button', { name: 'Confirm submission', exact: true }).click()
      await expect(
        owner.getByText('This submission is final and cannot be edited.', { exact: true })
      ).toBeVisible()
      await staff.goto(`/government/cases?agencyId=${agencyId}`)
      await staff
        .getByRole('link', { name: 'Journey follow-up', exact: true })
        .and(staff.locator('a[href^="/government/submissions/"]'))
        .click()
      await expect(
        staff.getByText('Organization follow-up completed', { exact: true })
      ).toBeVisible()
    })
    expect(errors).toEqual([])
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})
