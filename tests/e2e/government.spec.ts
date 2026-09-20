import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
const password = 'Government-test-only-2026!'
const select = async (page: Page, label: RegExp, name: string) => {
  const field = page.getByRole('combobox', { name: label })
  if (await field.evaluate((element) => element.tagName === 'SELECT'))
    await field.selectOption({ label: name })
  else {
    await field.click()
    await page.getByRole('option', { name, exact: true }).click()
  }
}
const screenshot = async (page: Page, name: string) => {
  mkdirSync('.agent/visual', { recursive: true })
  const theme = (await page.locator('gcds-header').count()) ? 'gcdesign' : 'nuxtui'
  await page.screenshot({ path: `.agent/visual/${theme}-${name}.png`, fullPage: true })
}
// Independent journeys share the production server's loopback rate-limit bucket.
test.beforeEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 11000))
})
test('root invites staff; staff publish funding; applicants need an explicit grant; API stays agency scoped', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const suffix = Date.now()
  const staffEmail = `government-${suffix}@example.test`
  await page.goto('/government/login')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Government staff sign in' })
  ).toBeVisible()
  await page.getByLabel(/^Email address/).fill('root@example.test')
  await page.getByLabel(/^Password/).fill('Root-test-only-2026!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/government$/)
  await page.getByRole('link', { name: 'Government staff', exact: true }).click()
  await page.getByLabel(/^Full name/).fill('Funding Officer')
  await page.getByLabel(/^Email address/).fill(staffEmail)
  await page.getByRole('button', { name: 'Create invitation', exact: true }).click()
  await expect(page.getByLabel(/^Invitation link/)).toHaveValue(/\/government\/invitations\//)
  const invitationUrl = await page.getByLabel(/^Invitation link/).inputValue()
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  const staff = await context.newPage()
  staff.on('pageerror', (error) => errors.push(error.message))
  try {
    await staff.goto(invitationUrl)
    await staff.getByRole('link', { name: 'Create an account to join' }).click()
    await staff.getByLabel(/^Full name/).fill('Funding Officer')
    await staff.getByLabel(/^Password/).fill(password)
    await staff.getByLabel(/^Confirm password/).fill(password)
    await staff.getByRole('button', { name: 'Create an account', exact: true }).click()
    await expect(staff.getByRole('heading', { name: 'Government staff invitation' })).toBeVisible()
    await staff.getByRole('button', { name: 'Accept invitation', exact: true }).click()
    await expect(staff).toHaveURL(/\/government$/)
    expect((await staff.request.get('/api/organizations')).status()).toBe(403)
    await staff.goto('/organizations')
    await expect(staff).toHaveURL(/\/government$/)
    expect((await staff.request.get('/api/government/staff')).status()).toBe(403)
    await staff.getByLabel(/^Name in English/).fill('Canadian Innovation Agency')
    await staff.getByLabel(/^Name in French/).fill('Agence canadienne de l’innovation')
    await staff.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(
      staff.getByRole('heading', { level: 1, name: 'Canadian Innovation Agency' })
    ).toBeVisible()
    const agencyId = staff.url().split('/').at(-1)!
    await staff.getByLabel(/^Name in English/).fill('Community innovation')
    await staff.getByLabel(/^Name in French/).fill('Innovation communautaire')
    await staff.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(
      staff.getByRole('button', { name: 'Edit Community innovation', exact: true })
    ).toBeVisible()
    await staff.getByRole('button', { name: 'Streams', exact: true }).click()
    await select(staff, /^Program/, 'Community innovation')
    await staff.getByLabel(/^Name in English/).fill('Digital inclusion')
    await staff.getByLabel(/^Name in French/).fill('Inclusion numérique')
    await staff.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(
      staff.getByRole('button', { name: 'Edit Digital inclusion', exact: true })
    ).toBeVisible()
    await staff.getByRole('button', { name: 'Calls for proposals', exact: true }).click()
    await select(staff, /^Stream/, 'Community innovation — Digital inclusion')
    await staff.getByLabel(/^Name in English/).fill('Connected communities 2027')
    await staff.getByLabel(/^Name in French/).fill('Collectivités branchées 2027')
    await staff.getByLabel(/^Start date/).fill('2027-01-01')
    await staff.getByLabel(/^End date/).fill('2027-06-30')
    await staff.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(staff.getByRole('cell', { name: 'Draft', exact: true })).toBeVisible()
    const applicantContext = await browser.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { Origin: baseURL! }
    })
    const applicant = await applicantContext.newPage()
    applicant.on('pageerror', (error) => errors.push(error.message))
    try {
      const signup = await applicant.request.post('/api/auth/sign-up/email', {
        data: { name: 'Funding Applicant', email: `applicant-${suffix}@example.test`, password }
      })
      expect(signup.ok()).toBe(true)
      const organization = (
        await (
          await applicant.request.post('/api/organizations', {
            data: { name: 'Community partnership' }
          })
        ).json()
      ).organization
      const session = await (await applicant.request.get('/api/session')).json()
      expect(session.government).toBeNull()
      expect((await applicant.request.get(`/api/government/agencies/${agencyId}`)).status()).toBe(
        403
      )
      expect(
        (
          await applicant.request.get(`/api/organizations/${organization.id}/funding-calls`)
        ).status()
      ).toBe(403)
      await applicant.goto(`/organizations/${organization.id}`)
      await expect(
        applicant.getByRole('link', { name: 'Apply for funding', exact: true })
      ).toHaveCount(0)
      await expect(
        applicant.getByRole('link', { name: 'Government staff', exact: true })
      ).toHaveCount(0)
      await applicant.getByRole('button', { name: 'People', exact: true }).click()
      await select(applicant, /^Applications$/, 'Viewer')
      await applicant.getByRole('link', { name: 'Apply for funding', exact: true }).click()
      await expect(
        applicant.getByText('There are no published calls for proposals yet.')
      ).toBeVisible()
      await staff.getByRole('button', { name: 'Publish', exact: true }).click()
      await staff.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(staff.getByRole('cell', { name: 'Published', exact: true })).toBeVisible()
      await applicant.reload()
      await expect(
        applicant.getByRole('heading', { name: 'Connected communities 2027' })
      ).toBeVisible()
      await screenshot(staff, 'government-calls-desktop')
      await screenshot(applicant, 'funding-desktop')
      await staff.setViewportSize({ width: 390, height: 844 })
      expect(await staff.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await screenshot(staff, 'government-calls-mobile')
      await applicant.setViewportSize({ width: 390, height: 844 })
      expect(
        await applicant.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
      ).toBe(true)
      await applicant.getByRole('button', { name: 'Français', exact: true }).click()
      await expect(
        applicant.getByRole('heading', { name: 'Collectivités branchées 2027' })
      ).toBeVisible()
      await expect(
        applicant.getByRole('heading', { level: 1, name: 'Demander du financement' })
      ).toBeVisible()
      await screenshot(applicant, 'funding-mobile-fr')
      await staff.getByRole('button', { name: 'Unpublish', exact: true }).click()
      await staff.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(staff.getByRole('cell', { name: 'Draft', exact: true })).toBeVisible()
      expect(
        (
          await (
            await applicant.request.get(`/api/organizations/${organization.id}/funding-calls`)
          ).json()
        ).calls
      ).toHaveLength(0)
    } finally {
      await applicantContext.close()
    }
    await page.reload()
    const person = (await (await page.request.get('/api/government/staff')).json()).find(
      (item: { email: string }) => item.email === staffEmail
    )
    // Better Auth IDs are opaque strings, not necessarily UUIDs.
    expect(
      (
        await page.request.patch(`/api/government/staff/${person.userId}/access`, {
          data: { agencyIds: [agencyId] }
        })
      ).ok()
    ).toBe(true)
    await page.getByRole('link', { name: 'API integrations', exact: true }).click()
    await page.getByLabel(/^Credential name/).fill('GCS–SSC extension')
    await select(page, /^Agency/, 'Canadian Innovation Agency')
    await page.getByRole('button', { name: 'Create credential', exact: true }).click()
    await expect(page.getByLabel(/^API credential/)).toHaveValue(/^gcs_/)
    const credential = await page.getByLabel(/^API credential/).inputValue()
    const machine = await browser.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { Authorization: `Bearer ${credential}` }
    })
    try {
      expect((await machine.request.get(`/api/government/agencies/${agencyId}`)).ok()).toBe(true)
      expect((await machine.request.get('/api/government/staff')).status()).toBe(403)
      expect(
        (
          await machine.request.post('/api/government/agencies', {
            data: { nameEn: 'Forbidden', nameFr: 'Interdit' }
          })
        ).status()
      ).toBe(403)
      const program = await machine.request.post('/api/government/programs', {
        data: { agencyId, nameEn: 'API program', nameFr: 'Programme API' }
      })
      expect(program.ok()).toBe(true)
      const foreign = (
        await (
          await page.request.post('/api/government/agencies', {
            data: { nameEn: 'Other agency', nameFr: 'Autre organisme' }
          })
        ).json()
      ).agency
      expect((await machine.request.get(`/api/government/agencies/${foreign.id}`)).status()).toBe(
        404
      )
      expect(
        (
          await machine.request.post('/api/government/programs', {
            data: { agencyId: foreign.id, nameEn: 'Forbidden', nameFr: 'Interdit' }
          })
        ).status()
      ).toBe(404)
      await page.getByRole('button', { name: 'Revoke', exact: true }).click()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
      await expect(page.getByRole('cell', { name: 'Revoked', exact: true })).toBeVisible()
      expect((await machine.request.get(`/api/government/agencies/${agencyId}`)).status()).toBe(401)
    } finally {
      await machine.close()
    }
    expect(
      (
        await staff.request.post('/api/government/agencies', {
          headers: { Origin: 'https://evil.example' },
          data: { nameEn: 'Wrong origin', nameFr: 'Mauvaise origine' }
        })
      ).status()
    ).toBe(403)
    expect(
      (
        await page.request.patch(`/api/government/staff/${person.userId}/status`, {
          data: { active: false }
        })
      ).ok()
    ).toBe(true)
    expect((await staff.request.get('/api/government/agencies')).status()).toBe(401)
  } finally {
    await context.close()
  }
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.goto('/login')
  await page.getByLabel(/^Email address/).fill('root@example.test')
  await page.getByLabel(/^Password/).fill('Root-test-only-2026!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByText('Government staff must use the government staff sign-in page.')
  ).toBeVisible()
  expect((await page.request.get('/api/session')).status()).toBe(200)
  expect((await page.request.get('/api/session')).json()).resolves.toMatchObject({ user: null })
  expect(errors).toEqual([])
})
