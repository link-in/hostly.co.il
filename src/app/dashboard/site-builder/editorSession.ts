import { getServerSession, type Session } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'

export type EditorUser = Session['user']

export const EDITOR_ERRORS = {
  session: 'יש להתחבר מחדש למערכת.',
  demo: 'שמירה ופרסום אינם זמינים במשתמש דמו.',
} as const

/** Signed-in, non-demo user with the site builder enabled. */
export async function getEditor(): Promise<{ user: EditorUser } | { error: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isSiteBuilderEnabled()) return { error: EDITOR_ERRORS.session }
  if (session.user.isDemo) return { error: EDITOR_ERRORS.demo }
  return { user: session.user }
}
