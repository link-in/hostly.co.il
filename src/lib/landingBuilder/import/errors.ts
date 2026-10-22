export type PropertyImportErrorCode = 'no_property' | 'not_found' | 'beds24_unavailable' | 'invalid_content'

export const IMPORT_ERROR_MESSAGES: Record<PropertyImportErrorCode | 'unknown', string> = {
  no_property: 'לחשבון עדיין לא מחובר נכס. השלימו קודם את החיבור ל-Beds24.',
  not_found: 'הנכס לא נמצא בחשבון ה-Beds24 המחובר.',
  beds24_unavailable: 'לא הצלחנו לקבל נתונים מ-Beds24. נסו שוב בעוד רגע.',
  invalid_content: 'נתוני הנכס שהתקבלו חלקיים. אפשר להמשיך ולערוך ידנית.',
  unknown: 'לא הצלחנו לייבא את נתוני הנכס. נסו שוב בעוד רגע.',
}

export class PropertyImportError extends Error {
  constructor(
    readonly code: PropertyImportErrorCode,
    detail?: string,
  ) {
    super(detail ?? code)
    this.name = 'PropertyImportError'
  }
}

export function toImportErrorMessage(error: unknown): string {
  return error instanceof PropertyImportError ? IMPORT_ERROR_MESSAGES[error.code] : IMPORT_ERROR_MESSAGES.unknown
}
