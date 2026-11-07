import type { Beds24TextEntry } from './beds24Property'

const PREFERRED_LANGUAGES = ['he', 'en']

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
}

/** Beds24 descriptions are often pasted HTML (inline styles, spans). Keep text and paragraph breaks only. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function byLanguagePreference(entries: Beds24TextEntry[]): Beds24TextEntry[] {
  const rank = (entry: Beds24TextEntry) => {
    const index = PREFERRED_LANGUAGES.indexOf(String(entry.language))
    return index === -1 ? PREFERRED_LANGUAGES.length : index
  }
  return [...entries].sort((a, b) => rank(a) - rank(b))
}

/**
 * First non-empty value of `fields` (in order), searching Hebrew, then English,
 * then any other language.
 */
export function pickLocalizedText(entries: Beds24TextEntry[], fields: readonly string[]): string {
  for (const entry of byLanguagePreference(entries)) {
    for (const field of fields) {
      const value = entry[field]
      if (typeof value === 'string') {
        const text = stripHtml(value)
        if (text) return text
      }
    }
  }
  return ''
}

/** First sentence of `text`, capped at `maxLength` on a word boundary. */
export function firstSentence(text: string, maxLength = 160): string {
  const sentence = text.split(/(?<=[.!?])\s|\n/)[0]?.trim() ?? ''
  if (sentence.length <= maxLength) return sentence
  const cut = sentence.slice(0, maxLength)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : maxLength).trim()}…`
}
