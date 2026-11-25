/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Refuses to run when the secret is unset. */
export function isCronAuthorized(request: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secret) {
    console.error('[Cron] CRON_SECRET is not configured — refusing to run')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
}
