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
  await expect(page.getByRole('heading', { name: 'Agencies' })).toBeVisible()
  await page.getByRole('link', { name: /Create an agency/ }).click()
  await expect(page).toHaveURL(/\/admin\/new$/)
  await page.getByLabel(/^Name in English/).fill(agencyName)
  await page.getByLabel(/^Name in French/).fill(`Agence ${suffix}`)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/agencies\/G-/)
  await expect(page.getByRole('heading', { name: agencyName })).toBeVisible()
  const agencyId = await page.locator('.identifier').first().textContent()
  expect(agencyId).toMatch(/^G-[A-HJKMNP-Z2-9]{5,}$/)
  await page.goto('/admin')
  await page.getByRole('link', { name: `Open agency: ${agencyName}` }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/agencies/${agencyId}$`))
  const accountMenu = page.getByRole('button', { name: 'Portal Root', exact: true })
  await accountMenu.focus()
  await page.keyboard.press('Enter')
  await expect(accountMenu).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Create credential', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Create credential' })).toBeVisible()
  await page.getByLabel(/^Credential name/).fill('GCS–SSC extension')
  await page.getByLabel(/^Expires after/).fill('0')
  await page.getByRole('button', { name: 'Create credential', exact: true }).click()
  await expect(
    page.getByText('Enter a whole number from 1 to 365, or leave this blank.')
  ).toBeVisible()
  await page.getByLabel(/^Expires after/).fill('')
  await expect(page.getByLabel(/^Expires after/)).toHaveValue('')
  await page.getByRole('button', { name: 'Create credential', exact: true }).click()
  await expect(page.getByText('Never expires')).toBeVisible()
  const headingBox = await page.getByRole('heading', { name: agencyName }).boundingBox()
  const resultBox = await page.locator('.credential-workflow').boundingBox()
  const tableBox = await page.locator('.table-scroll').boundingBox()
  expect(headingBox!.y).toBeLessThan(resultBox!.y)
  expect(resultBox!.y).toBeLessThan(tableBox!.y)
  await expect(page.getByLabel(/^API credential/)).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'View API key' }).click()
  await expect(page.getByLabel(/^API credential/)).toHaveAttribute('type', 'text')
  const key = await page.getByLabel(/^API credential/).inputValue()
  expect(key).toMatch(/^gcs_/)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy API key' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(key)
  await page.getByRole('button', { name: 'Hide API key' }).click()
  await expect(page.getByLabel(/^API credential/)).toHaveAttribute('type', 'password')
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
  await page.getByRole('button', { name: 'Replace key' }).first().click()
  await expect(page.getByText(/current key will stop working immediately/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Key replaced' })).toBeVisible()
  await expect(page.getByText('Changes saved.')).toHaveCount(0)
  await page.getByRole('button', { name: 'View API key' }).click()
  const replacement = await page.getByLabel(/^API credential/).inputValue()
  expect(replacement).toMatch(/^gcs_/)
  expect(replacement).not.toBe(key)
  const oldKeyResponse = await page.request.get(`/api/government/agencies/${agencyId}`, {
    headers: { Authorization: `Bearer ${key}` }
  })
  expect(oldKeyResponse.status()).toBe(401)
  const newKeyResponse = await page.request.get(`/api/government/agencies/${agencyId}`, {
    headers: { Authorization: `Bearer ${replacement}` }
  })
  expect(newKeyResponse.ok()).toBe(true)
  expect((await page.request.get('/api/organizations')).status()).toBe(401)
  await expect
    .poll(async () => {
      const response = await page.request.get('/api/admin/audit-events')
      const body = (await response.json()) as { items: { path: string }[] }
      return body.items.some((item) => item.path === '/api/admin/integration-tokens')
    })
    .toBe(true)
  await page.goto('/admin/evidence')
  await expect(page.getByRole('heading', { name: 'Audit events', exact: true })).toBeVisible()
  await expect(page.getByText('/api/admin/integration-tokens').first()).toBeVisible()
  await page.getByRole('link', { name: 'Access logs', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Access logs', exact: true })).toBeVisible()
  await expect(page.getByText('/api/government/agencies/:id').first()).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  expect((await page.request.get('/api/admin/agencies')).status()).toBe(401)
  expect((await page.request.get('/api/admin/audit-events')).status()).toBe(401)
  expect((await page.request.get('/api/admin/access-events')).status()).toBe(401)
})
