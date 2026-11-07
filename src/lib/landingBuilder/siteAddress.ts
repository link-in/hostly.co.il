/** Site addresses are subdomains of SITE_ROOT_DOMAIN: `{address}.hostly.co.il`. */
export const SITE_ROOT_DOMAIN = 'hostly.co.il'
export const SITE_ADDRESS_MIN_LENGTH = 3
export const SITE_ADDRESS_MAX_LENGTH = 30

const SITE_ADDRESS_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** Hostnames used by Hostly itself; also honored by `src/proxy.ts`. */
export const RESERVED_SITE_ADDRESSES: ReadonlySet<string> = new Set([
  'www', 'api', 'admin', 'dashboard', 'app', 'mail', 'ftp', 'webmail', 'test', 'dev', 'staging',
  'hostly', 'help', 'support', 'blog', 'docs', 'status', 'static', 'assets', 'cdn', 'media', 'auth',
  'login', 'signup', 'billing', 'demo', 'embed', 'preview', 'sites',
])

export type SiteAddressError = 'empty' | 'too_short' | 'too_long' | 'invalid' | 'reserved'

export const SITE_ADDRESS_ERROR_MESSAGES: Record<SiteAddressError, string> = {
  empty: 'יש לבחור כתובת לאתר.',
  too_short: `הכתובת צריכה להכיל לפחות ${SITE_ADDRESS_MIN_LENGTH} תווים.`,
  too_long: `הכתובת יכולה להכיל עד ${SITE_ADDRESS_MAX_LENGTH} תווים.`,
  invalid: 'אפשר להשתמש רק באותיות באנגלית, ספרות ומקף, בלי מקף בהתחלה או בסוף.',
  reserved: 'הכתובת שמורה למערכת. נסו כתובת אחרת.',
}

export const isReservedSiteAddress = (address: string) => RESERVED_SITE_ADDRESSES.has(address.toLowerCase())

/** Lowercases and turns spaces/underscores/dots into single hyphens; drops anything else. */
export function normalizeSiteAddress(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s_.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, SITE_ADDRESS_MAX_LENGTH)
}

export function validateSiteAddress(address: string): SiteAddressError | null {
  if (address.length === 0) return 'empty'
  if (address.length < SITE_ADDRESS_MIN_LENGTH) return 'too_short'
  if (address.length > SITE_ADDRESS_MAX_LENGTH) return 'too_long'
  if (!SITE_ADDRESS_PATTERN.test(address)) return 'invalid'
  if (isReservedSiteAddress(address)) return 'reserved'
  return null
}

export function buildSiteHost(address: string): string {
  return `${address}.${SITE_ROOT_DOMAIN}`
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

/** The proxy maps subdomains only on hostly.co.il, so a local dev server serves the site at `/{address}`. */
export function buildSiteUrl(address: string, currentOrigin?: string): string {
  if (currentOrigin && LOCAL_HOSTS.has(new URL(currentOrigin).hostname)) return `${currentOrigin}/${address}`
  return `https://${buildSiteHost(address)}`
}

const HEBREW_LETTERS: Record<string, string> = {
  א: 'a', ב: 'b', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'ch', ט: 't', י: 'y', כ: 'k', ך: 'ch',
  ל: 'l', מ: 'm', ם: 'm', נ: 'n', ן: 'n', ס: 's', ע: 'a', פ: 'p', ף: 'f', צ: 'tz', ץ: 'tz', ק: 'k',
  ר: 'r', ש: 'sh', ת: 't',
}

/** Best-effort letter mapping (Hebrew has no written vowels), e.g. "נוף" -> "nof". */
function transliterateHebrewWord(word: string): string {
  const letters = [...word]
  return letters
    .map((letter, index) => {
      const first = index === 0
      const last = index === letters.length - 1
      if (letter === 'ו') return first || letters[index - 1] === 'ו' ? 'v' : letters[index + 1] === 'ו' ? '' : 'o'
      if (letter === 'י') return first ? 'y' : letters[index + 1] === 'י' ? '' : 'i'
      if (letter === 'ה' && last) return 'a'
      if (letter === 'פ' && !first) return 'f'
      if (letter === 'כ' && !first) return 'ch'
      return HEBREW_LETTERS[letter] ?? letter
    })
    .join('')
}

export function transliterateHebrew(text: string): string {
  return text.replace(/[\u05d0-\u05ea]+/g, transliterateHebrewWord)
}

const hasLatinWord = (text: string) => /[a-z]{3,}/i.test(text)

/** English property name > English city > transliterated name; '' when nothing usable is left. */
export function suggestSiteAddress({ name, city }: { name: string; city: string }): string {
  const source = hasLatinWord(name) ? name.replace(/[^\sa-z0-9-]/gi, ' ') : hasLatinWord(city) ? city : transliterateHebrew(name)
  const address = normalizeSiteAddress(source.trim()).replace(/^-+|-+$/g, '')
  return validateSiteAddress(address) === null ? address : ''
}
