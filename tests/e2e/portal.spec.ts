import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const browserErrors = new WeakMap<Page, string[]>()
const recordErrors = (page: Page) => {
  const errors: string[] = []
  browserErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
}
test.beforeEach(async ({ page }) => {
  // Each journey shares the production server's loopback IP. Respect Better Auth's
  // short signup/signin rate-limit window across otherwise independent journeys.
  await new Promise((resolve) => setTimeout(resolve, 11000))
  recordErrors(page)
})
test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([])
})
const screenshot = async (page: Page, name: string) => {
  const directory = join(process.cwd(), '.agent', 'visual')
  mkdirSync(directory, { recursive: true })
  await page.screenshot({ path: join(directory, `gcdesign-${name}.png`), fullPage: true })
}

const password = 'Portal end-to-end passphrase 2026!'
const signUp = async (page: Page, name: string, email: string) => {
  await page.getByLabel(/^Full name/).fill(name)
  await page.getByLabel(/^Email address/).fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByLabel(/^Confirm password/).fill(password)
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
}

const confirm = async (page: Page) => {
  await page
    .getByRole('region', { name: 'Confirm this change' })
    .getByRole('button', { name: 'Confirm', exact: true })
    .click()
}

test('registration, invitation access, per-organization permissions and ownership transfer', async ({
  page,
  browser,
  baseURL
}) => {
  const suffix = `${Date.now()}`
  const ownerEmail = `owner-${suffix}@example.test`
  const memberEmail = `member-${suffix}@example.test`
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('gcds-top-nav').getByRole('link', { name: 'Sign in' })).toBeVisible()
  const navBand = await page.locator('gcds-top-nav').boundingBox()
  const navSignIn = await page
    .locator('gcds-top-nav')
    .getByRole('link', { name: 'Sign in' })
    .boundingBox()
  expect(navBand).not.toBeNull()
  expect(navSignIn).not.toBeNull()
  expect(
    Math.abs(navSignIn!.y + navSignIn!.height / 2 - (navBand!.y + navBand!.height / 2))
  ).toBeLessThan(2)
  await expect(page.locator('gcds-top-nav gcds-nav-link[slot="home"]')).not.toHaveAttribute(
    'current',
    ''
  )
  await expect(
    page.getByRole('region', { name: 'A shared space for your organization', exact: true })
  ).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'A shared space for your organization', exact: true })
      .getByRole('listitem')
  ).toHaveCount(3)
  await screenshot(page, 'home-desktop')
  await page.goto('/register')
  await signUp(page, 'Alex Owner', ownerEmail)
  await expect(page).toHaveURL(/\/organizations\/new$/)
  await page.getByLabel(/^Organization name/).fill('Shared services team')
  await page.getByLabel(/^Description/).fill('A team working together on public services.')
  await page.getByRole('button', { name: 'Create organization', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Shared services team' })).toBeVisible()
  await screenshot(page, 'organization-desktop')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'organization-mobile')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.setViewportSize({ width: 1440, height: 1050 })
  const organizationId = page.url().split('/').pop()!
  expect(organizationId).toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
  )

  await page.getByRole('link', { name: 'Invitations', exact: true }).click()
  const signoutHeight = await page
    .getByRole('button', { name: 'Sign out', exact: true })
    .evaluate((button) => button.getBoundingClientRect().height)
  const createHeight = await page
    .getByRole('button', { name: 'Create invitation link' })
    .evaluate((button) => button.getBoundingClientRect().height)
  expect(signoutHeight).toBeLessThan(createHeight)
  await page.getByLabel(/^Email address/).fill(memberEmail)
  await page.getByLabel(/^Full name/).fill('Sam Member')
  await page.getByRole('button', { name: 'Create invitation link' }).click()
  await expect(page.getByLabel(/^Invitation link/)).toHaveValue(/\/invitations\//)
  await expect(page.getByLabel(/^Invitation link/)).toHaveAttribute('readonly', '')
  const invitationUrl = await page.getByLabel(/^Invitation link/).inputValue()
  const token = invitationUrl.split('/').pop()!
  const preview = await page.request.get(`/api/invitations/${token}`)
  expect(preview.ok()).toBeTruthy()
  const invitationPreview = await preview.json()
  expect(invitationPreview.email).toBe(memberEmail)
  const remainingDays = (Date.parse(invitationPreview.expiresAt) - Date.now()) / 86_400_000
  expect(remainingDays).toBeGreaterThan(2.9)
  expect(remainingDays).toBeLessThanOrEqual(3)
  expect((await page.request.post(`/api/invitations/${token}/accept`, { data: {} })).status()).toBe(
    403
  )

  const memberContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  const memberPage = await memberContext.newPage()
  recordErrors(memberPage)
  try {
    await memberPage.goto(invitationUrl)
    await memberPage.getByRole('link', { name: 'Create an account to join' }).click()
    await expect(memberPage.getByLabel(/^Email address/)).toHaveValue(memberEmail)
    await signUp(memberPage, 'Sam Member', memberEmail)
    await memberPage.getByRole('button', { name: 'Accept invitation', exact: true }).click()
    await expect(
      memberPage.getByRole('heading', { level: 1, name: 'Shared services team' })
    ).toBeVisible()
    await expect(memberPage.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0)
    const memberOrgResponse = await memberPage.request.get(`/api/organizations/${organizationId}`)
    const memberOrg = (await memberOrgResponse.json()).organization
    expect(memberOrg.permissions).toEqual(['user'])
    const memberSession = await memberPage.request.get('/api/session')
    const memberId = (await memberSession.json()).user.id
    expect(
      (
        await memberPage.request.post(`/api/organizations/${organizationId}/invitations`, {
          data: { email: 'unauthorized@example.test' }
        })
      ).status()
    ).toBe(403)
    expect(
      (
        await memberPage.request.patch(`/api/organizations/${organizationId}/members/${memberId}`, {
          data: { permissions: ['user', 'admin'] }
        })
      ).status()
    ).toBe(403)
    expect(
      (await memberPage.request.post(`/api/invitations/${token}/accept`, { data: {} })).status()
    ).toBe(404)

    const secondOrganizationResponse = await page.request.post('/api/organizations', {
      data: { name: 'Separate organization', description: '' }
    })
    expect(secondOrganizationResponse.ok()).toBeTruthy()
    const secondOrganization = (await secondOrganizationResponse.json()).organization
    expect(
      (await memberPage.request.get(`/api/organizations/${secondOrganization.id}`)).status()
    ).toBe(404)
    expect(
      (
        await memberPage.request.patch(`/api/organizations/${secondOrganization.id}`, {
          data: { name: 'Cross organization mutation' }
        })
      ).status()
    ).toBe(404)
    expect(
      (
        await page.request.post('/api/organizations', {
          headers: { Origin: 'https://other.example' },
          data: { name: 'Untrusted origin' }
        })
      ).status()
    ).toBe(403)

    await page.reload()
    await page.getByRole('link', { name: 'People', exact: true }).click()
    const memberRow = page.getByRole('row', { name: new RegExp(memberEmail) })
    await expect(memberRow).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await page
      .getByRole('button', { name: `Edit permissions — ${memberEmail}`, exact: true })
      .click()
    await page.getByRole('combobox', { name: 'Applications', exact: true }).selectOption('viewer')
    await expect(page.getByText('Permissions updated.', { exact: true })).toBeVisible()
    const updatedPeople = await (
      await page.request.get(`/api/organizations/${organizationId}/members`)
    ).json()
    expect(
      updatedPeople.members.find((member: { userId: string }) => member.userId === memberId)
        .permissions
    ).toContain('application:viewer')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await screenshot(page, 'people-mobile')
    await page.setViewportSize({ width: 1440, height: 1050 })
    await page.getByRole('button', { name: 'Make administrator', exact: true }).click()
    await confirm(page)
    await expect(
      page.getByRole('button', { name: 'Remove administrator', exact: true })
    ).toBeVisible()
    await memberPage.reload()
    await expect(memberPage.getByRole('link', { name: 'Settings', exact: true })).toBeVisible()
    expect(
      (await memberPage.request.get(`/api/organizations/${secondOrganization.id}`)).status()
    ).toBe(404)
    expect(
      (
        await memberPage.request.post(`/api/organizations/${organizationId}/transfer`, {
          data: { userId: memberId }
        })
      ).status()
    ).toBe(403)

    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    const ownerSelect = page.getByRole('combobox', { name: /^New owner/ })
    await ownerSelect.selectOption(memberId)
    await page.getByRole('button', { name: 'Transfer ownership', exact: true }).click()
    await confirm(page)
    await expect(page.getByText('Ownership transferred.', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Transfer ownership', exact: true })
    ).toHaveCount(0)
    const transferred = (
      await (await memberPage.request.get(`/api/organizations/${organizationId}`)).json()
    ).organization
    expect(transferred.ownerId).toBe(memberId)
    expect(transferred.permissions).toEqual(expect.arrayContaining(['user', 'admin']))

    await page.getByRole('link', { name: 'Invitations', exact: true }).click()
    const revokedEmail = `revoked-${suffix}@example.test`
    await page.getByLabel(/^Email address/).fill(revokedEmail)
    await page.getByRole('button', { name: 'Create invitation link' }).click()
    await expect(page.getByLabel(/^Invitation link/)).toHaveValue(/\/invitations\//)
    const revokedUrl = await page.getByLabel(/^Invitation link/).inputValue()
    await page.getByRole('button', { name: `Revoke invitation — ${revokedEmail}` }).click()
    await confirm(page)
    await expect(
      page.getByRole('row', { name: new RegExp(`${revokedEmail}.*Revoked`) })
    ).toBeVisible()
    await memberPage.goto(revokedUrl)
    await expect(
      memberPage.getByRole('heading', { name: 'This invitation is unavailable' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    expect((await page.request.get(`/api/organizations/${organizationId}`)).status()).toBe(401)
  } finally {
    const memberErrors = browserErrors.get(memberPage)
    await memberContext.close()
    expect(memberErrors).toEqual([])
  }
})

test('mobile bilingual navigation and accessible required fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await screenshot(page, 'home-mobile')
  await page.goto('/register')
  for (const label of [/^Full name/, /^Email address/, /^Password/, /^Confirm password/]) {
    await expect(page.getByLabel(label)).toHaveAttribute('required', '')
  }
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
  await expect(page).toHaveURL(/\/register$/)
  await page.locator('gcds-lang-toggle').getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Créez votre compte' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByLabel(/^Nom complet/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Créez votre compte' })).toBeVisible()
  await page.locator('gcds-lang-toggle').getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible()
})

test('expired sessions and wrong-account sign-out preserve the intended destination', async ({
  page
}) => {
  const email = `session-${Date.now()}@example.test`
  const signup = await page.request.post('/api/auth/sign-up/email', {
    data: { name: 'Session Owner', email, password }
  })
  expect(signup.ok()).toBeTruthy()
  const created = await page.request.post('/api/organizations', {
    data: { name: 'Session recovery team', description: '' }
  })
  expect(created.ok()).toBeTruthy()
  const organization = (await created.json()).organization
  const destination = `/organizations/${organization.id}`
  const invited = await page.request.post(`/api/organizations/${organization.id}/invitations`, {
    data: { email: `other-${Date.now()}@example.test` }
  })
  expect(invited.ok()).toBeTruthy()
  const invitationUrl = (await invited.json()).url
  await page.goto(destination)
  await page.getByRole('link', { name: 'Invitations', exact: true }).click()
  await page.context().clearCookies()
  await page.getByLabel(/^Email address/).fill('expired-session@example.test')
  await page.getByRole('button', { name: 'Create invitation link' }).click()
  await expect(page).toHaveURL(/\/login\?next=/)
  expect(new URL(page.url()).searchParams.get('next')).toBe(`${destination}?section=invitations`)
  await page.getByLabel(/^Email address/).fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Session recovery team' })).toBeVisible()
  await page.goto(invitationUrl)
  await expect(
    page.getByText('You are signed in with a different email address.', { exact: false })
  ).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login\?next=/)
  expect(new URL(page.url()).searchParams.get('next')).toBe(new URL(invitationUrl).pathname)
})
