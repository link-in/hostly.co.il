import { test, expect } from '@playwright/test'
import { signInAsDemoUser } from './helpers/session'

/**
 * HOS-32: אפשר להוסיף/לערוך עלות מנקה בהזמנה קיימת (כולל Airbnb / Booking.com)
 * מעמוד "כל ההזמנות", והסיכום מתעדכן.
 */
test('מוסיפים עלות מנקה להזמנת Airbnb קיימת מעמוד כל ההזמנות', async ({ page, context, baseURL }) => {
  await signInAsDemoUser(context, baseURL!)

  const patchBodies: Array<Record<string, unknown>> = []
  await page.route('**/api/commission-rates', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rates: { booking: 0.15, airbnb: 0.16, direct: 0 } }) }),
  )
  await page.route('**/api/dashboard/bookings', async (route) => {
    if (route.request().method() === 'PATCH') {
      patchBodies.push(route.request().postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, demo: true }) })
      return
    }
    await route.continue()
  })

  await page.goto('/dashboard/reservations')

  await page.getByPlaceholder(/שם, מזהה/).fill('משה לוי')

  const row = page.locator('tr', { hasText: 'משה לוי' }).first()
  await expect(row).toBeVisible()
  await row.getByTestId('edit-cleaning-cost').click()

  const modal = page.getByTestId('cleaning-cost-modal')
  await expect(modal).toBeVisible()
  await modal.locator('#cleaning-cost-input').fill('180')
  await modal.locator('#cleaner-name-input').fill('רונית')
  await modal.getByRole('button', { name: 'שמור' }).click()

  await expect(modal).toBeHidden()
  await expect(row).toContainText('180')

  expect(patchBodies).toHaveLength(1)
  expect(patchBodies[0]).toMatchObject({ cleaningCost: 180, hasCleaning: true, cleanerName: 'רונית' })
  expect(patchBodies[0]).not.toHaveProperty('price')
  expect(patchBodies[0]).not.toHaveProperty('arrival')
})
