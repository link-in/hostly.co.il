/**
 * Admin-only QA mode for push notifications.
 *
 * Opening the dashboard with `?test_push=1` fires a fake "new booking" push and
 * force-shows the notifications prompt. Because an installed PWA has no address
 * bar, admins reach it through a link on the profile page (QA_PUSH_TEST_HREF).
 */

export const QA_PUSH_TEST_PARAM = 'test_push'
export const QA_PUSH_TEST_HREF = `/dashboard?${QA_PUSH_TEST_PARAM}=1`

/** Only admins may use the push QA mode. */
export function canRunPushQaTest(role: string | null | undefined): boolean {
  return role === 'admin'
}

/** QA mode is active only when the URL param is set AND the user is an admin. */
export function isPushQaTestActive(
  paramValue: string | null | undefined,
  role: string | null | undefined,
): boolean {
  return paramValue === '1' && canRunPushQaTest(role)
}
