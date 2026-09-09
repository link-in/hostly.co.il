import { test, expect } from '@playwright/test'

/**
 * Login-screen password visibility toggle (HOS-6).
 * Does not sign in — only checks that the field can switch between masked
 * dots and the actual password without depending on Beds24 or Supabase.
 */
test('login password field toggles between masked and visible text', async ({ page }) => {
  await page.goto('/')

  const password = page.getByPlaceholder('••••••••')
  await expect(password).toBeVisible()
  await expect(password).toHaveAttribute('type', 'password')

  await password.fill('secret123')

  await page.getByRole('button', { name: 'הצג סיסמה' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(password).toHaveValue('secret123')

  await page.getByRole('button', { name: 'הסתר סיסמה' }).click()
  await expect(password).toHaveAttribute('type', 'password')
  await expect(password).toHaveValue('secret123')
})
