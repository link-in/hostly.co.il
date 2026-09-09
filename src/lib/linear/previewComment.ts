/**
 * Helpers for attaching a Vercel Preview URL to the matching Linear issue.
 * Keep the regex/comment shape in sync with `.github/scripts/comment-linear-preview.mjs`.
 */

const ISSUE_ID_RE = /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g
const FIXES_ISSUE_RE = /\b(?:fixes|closes|resolves)\s+([A-Z][A-Z0-9]{1,9}-\d+)\b/i

export function extractLinearIssueId(text: string | null | undefined): string | null {
  if (!text) return null

  const fixes = text.match(FIXES_ISSUE_RE)
  if (fixes?.[1]) return fixes[1].toUpperCase()

  const matches = [...text.matchAll(ISSUE_ID_RE)]
  if (matches.length === 0) return null
  return matches[0][1].toUpperCase()
}

export function extractLinearIssueIdFromSources(sources: Array<string | null | undefined>): string | null {
  for (const source of sources) {
    const id = extractLinearIssueId(source)
    if (id) return id
  }
  return null
}

export function alreadyPostedPreviewUrl(existingBodies: string[], previewUrl: string): boolean {
  return existingBodies.some((body) => body.includes(previewUrl))
}

export function buildLinearPreviewComment(input: {
  previewUrl: string
  prUrl?: string
  branch?: string
}): string {
  const lines = [
    'קישור Preview לבדיקה במובייל:',
    '',
    input.previewUrl,
  ]

  if (input.branch) {
    lines.push('', 'ענף:', input.branch)
  }

  if (input.prUrl) {
    lines.push('', 'בקשת משיכה:', input.prUrl)
  }

  return lines.join('\n')
}
