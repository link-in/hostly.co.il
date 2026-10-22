import { describe, expect, it } from 'vitest'
import { firstSentence, pickLocalizedText, stripHtml } from './localizedText'

describe('stripHtml', () => {
  it('removes tags and inline styles, keeping the text', () => {
    expect(stripHtml('<span style="color: red">שלום</span> <b>עולם</b>')).toBe('שלום עולם')
  })

  it('turns line breaks and paragraph ends into newlines', () => {
    expect(stripHtml('<p>שורה א</p><p>שורה ב</p>שורה ג<br/>שורה ד')).toBe('שורה א\nשורה ב\nשורה ג\nשורה ד')
  })

  it('decodes common entities and collapses whitespace', () => {
    expect(stripHtml('a&nbsp;&amp;&nbsp;b   c &quot;d&quot;')).toBe('a & b c "d"')
  })

  it('returns plain text unchanged', () => {
    expect(stripHtml('  טקסט רגיל  ')).toBe('טקסט רגיל')
  })
})

describe('pickLocalizedText', () => {
  const entries = [
    { language: 'de', title: 'Deutsch' },
    { language: 'en', title: 'English', body: 'en body' },
    { language: 'he', title: '', body: 'גוף בעברית' },
  ]

  it('prefers Hebrew over other languages', () => {
    expect(pickLocalizedText(entries, ['body'])).toBe('גוף בעברית')
  })

  it('falls back to English when the Hebrew field is empty', () => {
    expect(pickLocalizedText(entries, ['title'])).toBe('English')
  })

  it('falls back to any language when he/en are empty', () => {
    expect(pickLocalizedText([{ language: 'de', title: 'Deutsch' }, { language: 'en', title: '' }], ['title'])).toBe('Deutsch')
  })

  it('tries fields in order within the preferred language first', () => {
    expect(pickLocalizedText(entries, ['title', 'body'])).toBe('גוף בעברית')
  })

  it('ignores non-string values and returns empty when nothing matches', () => {
    expect(pickLocalizedText([{ language: 'he', title: 42 }], ['title', 'missing'])).toBe('')
  })
})

describe('firstSentence', () => {
  it('returns the text up to the first sentence end', () => {
    expect(firstSentence('משפט ראשון. משפט שני.')).toBe('משפט ראשון.')
  })

  it('stops at a newline', () => {
    expect(firstSentence('שורה ראשונה\nשורה שנייה')).toBe('שורה ראשונה')
  })

  it('caps long sentences on a word boundary', () => {
    expect(firstSentence('אחת שתיים שלוש ארבע', 12)).toBe('אחת שתיים…')
  })
})
