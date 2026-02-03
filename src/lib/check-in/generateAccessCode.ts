// Generate access codes for check-in

export function generateAccessCode(
  format: 'digits' | 'alphanumeric' | 'custom' = 'digits',
  customCode?: string
): string {
  if (format === 'custom' && customCode) {
    return customCode
  }

  if (format === 'digits') {
    // Generate 4 random digits
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  if (format === 'alphanumeric') {
    // Generate 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous characters
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Default: 4 digits
  return Math.floor(1000 + Math.random() * 9000).toString()
}
