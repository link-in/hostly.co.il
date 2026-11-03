import { test, expect, type Page, type Route } from '@playwright/test'
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessageChunk } from 'ai'
import { signInAsDemoUser } from './helpers/session'

/**
 * Chat UI flow for the AI assistant. The model never runs: `/api/ai-assistant/chat` is
 * fulfilled with a UI message stream built by the same `ai` library the route uses, so the
 * test exercises the real client parsing and rendering of tool parts. Confirmation server
 * actions are aborted — this suite never reaches Supabase or Beds24.
 */

const ACTION_ID = '7d2c9a8e-4f1b-4c3d-9e6a-1b2c3d4e5f60'

async function fulfillWithChunks(route: Route, chunks: UIMessageChunk[]): Promise<void> {
  const response = createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => chunks.forEach((chunk) => writer.write(chunk)),
    }),
  })
  await route.fulfill({
    status: 200,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  })
}

function toolTurn(toolName: string, input: unknown, output: unknown, reply: string): UIMessageChunk[] {
  return [
    { type: 'start' },
    { type: 'start-step' },
    { type: 'tool-input-available', toolCallId: 'call-1', toolName, input },
    { type: 'tool-output-available', toolCallId: 'call-1', output },
    { type: 'finish-step' },
    { type: 'start-step' },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: reply },
    { type: 'text-end', id: 'text-1' },
    { type: 'finish-step' },
    { type: 'finish' },
  ]
}

async function openAssistant(page: Page): Promise<void> {
  await page.goto('/dashboard/ai-assistant')
  await expect(page.getByTestId('ai-assistant-empty')).toBeVisible()
}

async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByTestId('ai-assistant-input').fill(text)
  await page.getByTestId('ai-assistant-send').click()
}

test.beforeEach(async ({ context, baseURL }) => {
  await signInAsDemoUser(context, baseURL!)
})

test('an availability question renders the availability card and the reply', async ({ page }) => {
  let sentText = ''
  await page.route('**/api/ai-assistant/chat', async (route) => {
    const body = route.request().postDataJSON() as { messages: { parts: { type: string; text?: string }[] }[] }
    sentText = body.messages.at(-1)?.parts.find((part) => part.type === 'text')?.text ?? ''
    await fulfillWithChunks(
      route,
      toolTurn(
        'check_availability',
        { property_id: 306559, start_date: '2027-03-12', end_date: '2027-03-14' },
        {
          ok: true,
          propertyId: 306559,
          checkIn: '2027-03-12',
          checkOut: '2027-03-14',
          nights: 2,
          rooms: [
            {
              roomId: 1,
              roomName: 'סוויטה',
              fullyAvailable: true,
              availableStays: [{ checkIn: '2027-03-12', checkOut: '2027-03-14' }],
              unavailableNights: [],
              nightlyPrices: { '2027-03-12': 700, '2027-03-13': 900 },
            },
            {
              roomId: 2,
              roomName: 'חדר גן',
              fullyAvailable: false,
              availableStays: [{ checkIn: '2027-03-12', checkOut: '2027-03-13' }],
              unavailableNights: ['2027-03-13'],
              nightlyPrices: { '2027-03-12': null, '2027-03-13': null },
            },
          ],
        },
        'הסוויטה פנויה בשני הלילות.',
      ),
    )
  })

  await openAssistant(page)
  await page.getByRole('button', { name: 'מה פנוי בסופ״ש הבא?' }).click()

  await expect(page.getByTestId('ai-assistant-message-user')).toHaveText('מה פנוי בסופ״ש הבא?')
  const card = page.getByTestId('ai-assistant-availability')
  await expect(card).toContainText('12.3–13.3')
  await expect(card).toContainText('2 לילות')
  await expect(card).toContainText('פנוי בכל הלילות')
  await expect(card).toContainText('לילה אחד תפוסים')
  await expect(card).toContainText('תפוס: 13.3')
  await expect(page.getByText('הסוויטה פנויה בשני הלילות.')).toBeVisible()
  expect(sentText).toBe('מה פנוי בסופ״ש הבא?')
})

test('a price proposal waits for confirmation and the click calls the server', async ({ page }) => {
  await page.route('**/api/ai-assistant/chat', (route) =>
    fulfillWithChunks(
      route,
      toolTurn(
        'update_price',
        { property_id: 306559, room_id: 1, start_date: '2027-03-12', end_date: '2027-03-13', new_price: 500 },
        {
          ok: true,
          status: 'awaiting_confirmation',
          actionId: ACTION_ID,
          expiresAt: '2027-03-01T10:15:00.000Z',
          instructions: 'ask the user to confirm',
          action: {
            actionType: 'update_price',
            payload: {
              propertyId: 306559,
              roomId: 1,
              roomName: 'סוויטה',
              from: '2027-03-12',
              to: '2027-03-12',
              checkIn: '2027-03-12',
              checkOut: '2027-03-13',
              nights: 1,
              newPrice: 500,
              channelPrices: [
                { channelKey: 'airbnb', name: 'Airbnb', price: 605 },
                { channelKey: 'direct', name: 'הזמנה ישירה', price: 500 },
              ],
            },
          },
        },
        'הכנתי עדכון מחיר. אשרו בכרטיס.',
      ),
    ),
  )

  let serverActionBody = ''
  await page.route('**/dashboard/ai-assistant', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST' || !request.headers()['next-action']) return route.continue()
    serverActionBody = request.postData() ?? ''
    await route.abort()
  })

  await openAssistant(page)
  await sendMessage(page, 'תעדכן את המחיר בסוויטה ב־12.3 ל־500')

  const card = page.getByTestId('ai-assistant-confirm-card')
  await expect(card).toContainText('עדכון מחיר · סוויטה')
  await expect(card).toContainText('12.3 · לילה אחד')
  await expect(card).toContainText(/מחיר בסיס חדש: .*500/)
  await expect(card).toContainText(/Airbnb: .*605/)
  await expect(page.getByTestId('ai-assistant-reject')).toBeEnabled()

  await page.getByTestId('ai-assistant-confirm').click()

  await expect(page.getByTestId('ai-assistant-confirm-outcome')).toContainText('לא התקבלה תשובה מהשרת')
  await expect(page.getByTestId('ai-assistant-confirm')).toHaveCount(0)
  expect(serverActionBody).toContain(ACTION_ID)
})

test('a rejected request shows the Hebrew error sent by the server', async ({ page }) => {
  await page.route('**/api/ai-assistant/chat', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'הגעת למגבלת ההודעות לשעה. נסו שוב בעוד כמה דקות.' }),
    }),
  )

  await openAssistant(page)
  await sendMessage(page, 'שלום')

  await expect(page.getByTestId('ai-assistant-error')).toHaveText('הגעת למגבלת ההודעות לשעה. נסו שוב בעוד כמה דקות.')
  await expect(page.getByTestId('ai-assistant-send')).toBeDisabled()
})
