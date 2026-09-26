import { expect, test } from '@playwright/test'

test('administrators register agencies and issue scoped extension keys', async ({
  page,
  browser,
  baseURL
}) => {
  await page.goto('/admin/login')
  await expect(page.getByRole('heading', { name: 'Administrator sign in' })).toBeVisible()
  await page.getByLabel(/^Email address/).fill('root@example.test')
  await page.getByLabel(/^Password/).fill('Root-test-only-2026!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  const suffix = Date.now()
  const agencyName = `Agency ${suffix}`
  await page.getByLabel(/^Name in English/).fill(agencyName)
  await page.getByLabel(/^Name in French/).fill(`Agence ${suffix}`)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText(agencyName)).toBeVisible()
  const agencyId = await page
    .locator('.service-list li')
    .filter({ hasText: agencyName })
    .locator('code')
    .textContent()
  expect(agencyId).toMatch(/^G-[A-HJKMNP-Z2-9]{5,}$/)
  const accountMenu = page.getByRole('button', { name: 'Portal Root', exact: true })
  await accountMenu.focus()
  await page.keyboard.press('Enter')
  await expect(accountMenu).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('link', { name: 'API integrations', exact: true }).first().click()
  await page.getByLabel(/^Credential name/).fill('GCS–SSC extension')
  const agencyField = page.getByRole('combobox', { name: /^Agency/ })
  await agencyField.selectOption({ label: agencyName })
  await page.getByRole('button', { name: 'Create credential', exact: true }).click()
  const key = await page.getByLabel(/^API credential/).inputValue()
  expect(key).toMatch(/^gcs_/)
  const machine = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${key}` }
  })
  try {
    expect((await machine.request.get(`/api/government/agencies/${agencyId}`)).ok()).toBe(true)
    expect(
      (
        await machine.request.post('/api/government/agencies', {
          data: { nameEn: 'No', nameFr: 'Non' }
        })
      ).status()
    ).toBe(404)
  } finally {
    await machine.close()
  }
  expect((await page.request.get('/api/organizations')).status()).toBe(401)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  expect((await page.request.get('/api/admin/agencies')).status()).toBe(401)
})
