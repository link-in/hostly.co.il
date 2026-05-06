import { Resend } from 'resend'

// Use onboarding@resend.dev until hostly.co.il domain is verified in Resend
const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'Hostly <onboarding@resend.dev>'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hostly.co.il'

/**
 * Sends a welcome email to a newly created user with their login credentials.
 */
export async function sendWelcomeEmail(params: {
  to: string
  displayName: string
  password: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping welcome email')
    return false
  }

  const resend = new Resend(apiKey)
  const { to, displayName, password } = params
  const loginUrl = `${BASE_URL}/`

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'ברוך הבא ל-Hostly - פרטי ההתחברות שלך',
      html: buildWelcomeEmailHtml({ displayName, email: to, password, loginUrl }),
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('sendWelcomeEmail error:', err)
    return false
  }
}

function buildWelcomeEmailHtml(params: {
  displayName: string
  email: string
  password: string
  loginUrl: string
}): string {
  const { displayName, email, password, loginUrl } = params

  return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ברוך הבא ל-Hostly</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Hostly</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">מערכת ניהול נכסים חכמה</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">ברוך הבא, ${displayName}! 👋</h2>
              <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.7;">
                החשבון שלך ב-Hostly נוצר בהצלחה. להלן פרטי ההתחברות שלך:
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border:1.5px solid #e0e4ff;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="8">
                      <tr>
                        <td style="color:#888;font-size:13px;padding-bottom:4px;">כתובת כניסה</td>
                      </tr>
                      <tr>
                        <td style="color:#667eea;font-size:14px;font-weight:600;padding-bottom:16px;">
                          <a href="${loginUrl}" style="color:#667eea;text-decoration:none;">${loginUrl}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#888;font-size:13px;padding-bottom:4px;">אימייל</td>
                      </tr>
                      <tr>
                        <td style="color:#1a1a2e;font-size:15px;font-weight:600;padding-bottom:16px;">${email}</td>
                      </tr>
                      <tr>
                        <td style="color:#888;font-size:13px;padding-bottom:4px;">סיסמה זמנית</td>
                      </tr>
                      <tr>
                        <td>
                          <span style="background:#fff3cd;color:#856404;font-size:16px;font-weight:700;padding:8px 16px;border-radius:8px;letter-spacing:1px;display:inline-block;">${password}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#888;font-size:13px;">
                ⚠️ מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                       style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;display:inline-block;">
                      כניסה למערכת
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">
                מייל זה נשלח אוטומטית ממערכת Hostly. אם קיבלת מייל זה בטעות, ניתן להתעלם ממנו.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
