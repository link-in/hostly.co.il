import { CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { ProfileSection } from './ProfileSection'
import { ResultAlerts } from './InlineAlert'
import { TextField } from './TextField'
import { SECTION_ICONS } from './sectionIcons'
import { useReceiptSettings, type ReceiptProvider } from '../hooks/useReceiptSettings'

export function ReceiptsSection({ enabled }: { enabled: boolean }) {
  const Icon = SECTION_ICONS.receipts
  const s = useReceiptSettings(enabled)
  const isIcount = s.provider === 'icount'

  return (
    <ProfileSection
      id="receipts"
      title="קבלות וחשבוניות"
      description="חיבור לספק מסמכי מס (כרגע iCount). צור API Token ב-iCount תחת הגדרות ← API"
      icon={<Icon size={20} />}
    >
      {s.loading ? (
        <div className="profile-field-hint">טוען הגדרות…</div>
      ) : (
        <>
          <div className="profile-grid">
            <div className="profile-field">
              <label htmlFor="receipt-provider" className="profile-field-label">
                ספק
              </label>
              <select
                id="receipt-provider"
                className="form-select"
                value={s.provider}
                onChange={(e) => s.setProvider(e.target.value as ReceiptProvider)}
              >
                <option value="icount">iCount</option>
                <option value="mock">Mock (בדיקות)</option>
              </select>
            </div>

            <div className="profile-field">
              <span className="profile-field-label">הנפקת מסמכים</span>
              <div className="form-check form-switch mt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="receipt-active"
                  checked={s.isActive}
                  onChange={(e) => s.setIsActive(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="receipt-active">
                  אפשר הנפקת מסמכים מהזמנה
                </label>
              </div>
            </div>

            {isIcount ? (
              <>
                <TextField
                  id="receipt-token"
                  label="API Token (iCount)"
                  type="password"
                  ltr
                  fullWidth
                  autoComplete="off"
                  placeholder={s.hasToken ? `שמור · ${s.tokenPreview || '••••'}` : 'הדבק API Token'}
                  hint="השאר ריק כדי לשמור את הטוקן הקיים"
                  value={s.apiToken}
                  onChange={s.setApiToken}
                />
                <TextField
                  id="receipt-vat"
                  label='ח.פ / ע.מ ברירת מחדל (אופציונלי)'
                  ltr
                  placeholder="לחשבוניות כשאין מספר ללקוח"
                  value={s.defaultVatId}
                  onChange={s.setDefaultVatId}
                />
              </>
            ) : null}
          </div>

          <div className="profile-actions">
            <Button
              variant="primary"
              onClick={s.save}
              loading={s.saving}
              disabled={s.testing}
              iconStart={<CheckCircle2 size={15} />}
            >
              שמור הגדרות קבלות
            </Button>
            {isIcount ? (
              <Button
                variant="secondary"
                onClick={s.testConnection}
                loading={s.testing}
                disabled={s.saving}
                iconStart={<RefreshCw size={15} />}
              >
                בדוק חיבור
              </Button>
            ) : null}
          </div>
        </>
      )}
      <ResultAlerts message={s.message} error={s.error} />
    </ProfileSection>
  )
}
