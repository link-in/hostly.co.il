import { describe, expect, it } from 'vitest'
import {
  alreadyPostedPreviewUrl,
  buildLinearPreviewComment,
  extractLinearIssueId,
  extractLinearIssueIdFromSources,
} from './previewComment'

describe('extractLinearIssueId', () => {
  it('reads Fixes ISSUE-ID from a PR body', () => {
    expect(extractLinearIssueId('Fixes HOS-7\n\nmore text')).toBe('HOS-7')
  })

  it('prefers a Fixes match over another ID in the same text', () => {
    expect(extractLinearIssueId('See ENG-9. Fixes HOS-7.')).toBe('HOS-7')
  })

  it('normalizes lowercase keywords and ids', () => {
    expect(extractLinearIssueId('fixes hos-7')).toBe('HOS-7')
  })

  it('falls back to the first TEAM-123 token', () => {
    expect(extractLinearIssueId('לודר כפול HOS-7 במובייל')).toBe('HOS-7')
  })

  it('returns null when nothing looks like a Linear id', () => {
    expect(extractLinearIssueId('cursor/hide-mobile-calendar-loader-3468')).toBeNull()
    expect(extractLinearIssueId('')).toBeNull()
    expect(extractLinearIssueId(null)).toBeNull()
  })

  it('reads an uppercase id out of a branch name', () => {
    expect(extractLinearIssueId('cursor/HOS-7-hide-calendar-loader')).toBe('HOS-7')
  })
})

describe('extractLinearIssueIdFromSources', () => {
  it('walks title, body, then branch until one matches', () => {
    expect(
      extractLinearIssueIdFromSources([
        'hide calendar loader',
        'Fixes HOS-7',
        'cursor/foo',
      ])
    ).toBe('HOS-7')
  })
})

describe('buildLinearPreviewComment', () => {
  it('puts the preview URL on its own line for easy mobile tap', () => {
    const body = buildLinearPreviewComment({
      previewUrl: 'https://example.vercel.app',
      prUrl: 'https://github.com/link-in/hostly.co.il/pull/3',
      branch: 'cursor/hide-mobile-calendar-loader-3468',
    })

    expect(body).toContain('קישור Preview לבדיקה במובייל:')
    expect(body).toContain('https://example.vercel.app')
    expect(body).toContain('https://github.com/link-in/hostly.co.il/pull/3')
    expect(body.split('\n')).toContain('https://example.vercel.app')
  })
})

describe('alreadyPostedPreviewUrl', () => {
  it('skips posting the same preview URL twice', () => {
    expect(
      alreadyPostedPreviewUrl(
        ['קישור ישן', 'https://example.vercel.app'],
        'https://example.vercel.app'
      )
    ).toBe(true)
  })

  it('allows a comment when the URL is new', () => {
    expect(alreadyPostedPreviewUrl(['אין קישור'], 'https://example.vercel.app')).toBe(false)
  })
})
