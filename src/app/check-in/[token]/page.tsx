'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import CheckInHeader from './components/CheckInHeader'
import ProgressBar from './components/ProgressBar'
import FileUploadZone from './components/FileUploadZone'
import SignaturePad from './components/SignaturePad'

interface CheckInData {
  id: string
  token: string
  guest_name: string
  guest_phone: string
  guest_email: string | null
  check_in_date: string
  check_out_date: string
  num_adults: number
  num_children: number
  status: string
  property_name: string
  owner_phone: string
  terms_template: string
  custom_terms?: string
  completed?: boolean
  expired?: boolean
  completedAt?: string
  accessCode?: string
}

interface CompletionData {
  access_code: string
  wifi_ssid: string
  wifi_password: string
  property_guide: string
  owner_phone: string
}

export default function CheckInPage() {
  const params = useParams()
  const token = params.token as string

  const [currentStep, setCurrentStep] = useState(1)
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completionData, setCompletionData] = useState<CompletionData | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    actual_num_guests: 2,
    estimated_arrival_time: '',
    terms_accepted: false,
    signature_data_url: '',
    id_document_uploaded: false,
  })

  // Fetch check-in data
  useEffect(() => {
    async function fetchCheckIn() {
      try {
        const res = await fetch(`/api/check-in/${token}`)
        const data = await res.json()

        if (!res.ok) {
          if (data.expired) {
            setError('קישור הצ\'ק-אין פג תוקפו. אנא צרו קשר עם בעל הנכס.')
          } else if (data.completed) {
            setCheckInData(data as CheckInData)
            setCurrentStep(4)
            setCompletionData({
              access_code: data.accessCode || '',
              wifi_ssid: '',
              wifi_password: '',
              property_guide: '',
              owner_phone: data.owner_phone || '',
            })
          } else {
            setError(data.error || 'שגיאה בטעינת פרטי הצ\'ק-אין')
          }
          setLoading(false)
          return
        }

        setCheckInData(data)
        setFormData(prev => ({
          ...prev,
          actual_num_guests: data.num_adults + data.num_children,
        }))
        setLoading(false)
      } catch (err) {
        setError('שגיאה בחיבור לשרת')
        setLoading(false)
      }
    }

    if (token) {
      fetchCheckIn()
    }
  }, [token])

  const handleUploadId = async (file: File) => {
    const formDataObj = new FormData()
    formDataObj.append('file', file)
    formDataObj.append('token', token)

    const res = await fetch('/api/check-in/upload-id', {
      method: 'POST',
      body: formDataObj,
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'שגיאה בהעלאת הקובץ')
    }

    setFormData(prev => ({ ...prev, id_document_uploaded: true }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.id_document_uploaded) {
      alert('אנא העלו תמונת תעודת זהות')
      return
    }

    // Validation happens in API

    if (!formData.terms_accepted) {
      alert('יש לאשר את תנאי האירוח')
      return
    }

    if (!formData.signature_data_url) {
      alert('אנא חתמו באזור החתימה')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/check-in/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          formData: {
            actual_num_guests: formData.actual_num_guests,
            estimated_arrival_time: formData.estimated_arrival_time || undefined,
            terms_accepted: formData.terms_accepted,
            signature_data_url: formData.signature_data_url,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בהשלמת הצ\'ק-אין')
      }

      setCompletionData(data)
      setCurrentStep(4)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'שגיאה בהשלמת הצ\'ק-אין')
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('הועתק ללוח!')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">טוען...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>שגיאה</h2>
          <p style={{ color: '#7f8c8d', fontSize: '1.1rem' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!checkInData) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', paddingBottom: '3rem' }}>
      <CheckInHeader propertyName={checkInData.property_name} />

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1rem' }}>
        <ProgressBar currentStep={currentStep} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              animation: 'fadeIn 0.5s',
            }}
          >
            <h1 style={{ fontSize: '2rem', color: '#2c3e50', marginBottom: '1rem' }}>
              ברוכים הבאים, {checkInData.guest_name}! 👋
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#7f8c8d', marginBottom: '2rem' }}>
              נשמח להשלים איתך את תהליך הצ'ק-אין הדיגיטלי. התהליך לוקח כ-3 דקות.
            </p>

            <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📅</span>
                  <div>
                    <strong>כניסה:</strong> {new Date(checkInData.check_in_date).toLocaleDateString('he-IL')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🗓️</span>
                  <div>
                    <strong>יציאה:</strong> {new Date(checkInData.check_out_date).toLocaleDateString('he-IL')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>👥</span>
                  <div>
                    <strong>מספר אורחים:</strong> {checkInData.num_adults + checkInData.num_children}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '1.2rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              בואו נתחיל 🚀
            </button>
          </div>
        )}

        {/* Step 2: Personal Details */}
        {currentStep === 2 && (
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              animation: 'fadeIn 0.5s',
            }}
          >
            <h2 style={{ fontSize: '1.8rem', color: '#2c3e50', marginBottom: '2rem' }}>
              העלאת תעודת זהות
            </h2>

            <div style={{ marginBottom: '2rem' }}>
              <FileUploadZone onUpload={handleUploadId} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label"><strong>מספר אורחים שיגיעו בפועל</strong></label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="20"
                value={formData.actual_num_guests}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_num_guests: parseInt(e.target.value) }))}
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label"><strong>שעת הגעה משוערת</strong></label>
              <input
                type="time"
                className="form-control"
                value={formData.estimated_arrival_time}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_arrival_time: e.target.value }))}
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setCurrentStep(1)}
                className="btn btn-outline-secondary"
                style={{ flex: 1, borderRadius: '12px', padding: '0.8rem' }}
              >
                → חזרה
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: '12px', padding: '0.8rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
              >
                המשך ←
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Terms and Signature */}
        {currentStep === 3 && (
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              animation: 'fadeIn 0.5s',
            }}
          >
            <h2 style={{ fontSize: '1.8rem', color: '#2c3e50', marginBottom: '2rem' }}>
              תנאי אירוח וחתימה דיגיטלית
            </h2>

            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                background: '#f8f9fa',
                lineHeight: '1.8',
                textAlign: 'right',
              }}
            >
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                🏡 הסכם תנאי אירוח והצהרת אחריות
              </h3>
              
              {checkInData.custom_terms ? (
                <div dangerouslySetInnerHTML={{ __html: checkInData.custom_terms }} />
              ) : (
                <div style={{ fontSize: '0.92rem' }}>
                  <p style={{ marginBottom: '1rem', fontWeight: '500' }}>
                    אני הח"מ מצהיר/ה כי קראתי והבנתי את תנאי ההסכם ומקבל/ת על עצמי את כל התחייבויותיו:
                  </p>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '0.8rem', marginBottom: '0.4rem' }}>
                    1️⃣ זמני כניסה ופינוי
                  </h4>
                  <p style={{ marginBottom: '0.7rem' }}>
                    כניסה: 15:00 | פינוי: 13:00<br/>
                    איחור בפינוי ללא אישור מראש יחייב בתשלום נוסף בסך 150 ₪ לכל שעת איחור.
                  </p>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '0.8rem', marginBottom: '0.4rem' }}>
                    2️⃣ שמירה על הנכס
                  </h4>
                  <p style={{ marginBottom: '0.7rem' }}>
                    השוכר מתחייב לשמור על שלמות הנכס ותכולתו ולהשתמש בהם בזהירות. חל איסור על הוצאת ציוד מהנכס. כל תקלה או נזק יש לדווח מיד.
                  </p>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '0.8rem', marginBottom: '0.4rem' }}>
                    3️⃣ אחריות לנזקים
                  </h4>
                  <p style={{ marginBottom: '0.7rem' }}>
                    השוכר נושא באחריות מלאה לכל נזק שייגרם לנכס כתוצאה משימוש, רשלנות או אי-קיום הוראות ההסכם. בעל הנכס רשאי לחייב את השוכר בעלות התיקון המלאה.
                  </p>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '0.8rem', marginBottom: '0.4rem' }}>
                    4️⃣ אחריות על קטינים
                  </h4>
                  <p style={{ marginBottom: '0.7rem' }}>
                    האחריות המלאה לבטיחות והשגחת קטינים (מתחת לגיל 18) חלה על השוכר בלבד. בעל הנכס אינו אחראי לנזקי גוף או פגיעות.
                  </p>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '0.8rem', marginBottom: '0.4rem' }}>
                    5️⃣ כללי שימוש
                  </h4>
                  <p style={{ marginBottom: '0.7rem' }}>
                    • איסור מוחלט על עישון בנכס<br/>
                    • שמירה על שקט בין 22:00-08:00 (חוק למניעת מפגעים)<br/>
                    • איסור על מסיבות או אורחים נוספים ללא תיאום מראש
                  </p>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '0.8rem', marginBottom: '0.4rem' }}>
                    6️⃣ מצלמות אבטחה
                  </h4>
                  <p style={{ marginBottom: '0.7rem' }}>
                    שטחי החוץ (כניסה וחצר) מצולמים 24/7 למטרות אבטחה בהתאם לחוק הגנת הפרטיות. אין מצלמות בחללי המגורים.
                  </p>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '0.8rem', marginBottom: '0.4rem' }}>
                    7️⃣ ויתור על תביעות
                  </h4>
                  <p style={{ marginBottom: '0.7rem' }}>
                    השימוש בנכס נעשה על אחריות השוכר בלבד. השוכר מוותר על כל תביעה כנגד בעל הנכס בגין נזקי גוף, פגיעה או אובדן רכוש אישי, אלא אם נגרם במזיד.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div 
                style={{ 
                  marginBottom: '1rem',
                  padding: '1rem',
                  border: '2px solid #e74c3c',
                  borderRadius: '8px',
                  background: '#fff5f5',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  direction: 'rtl',
                  textAlign: 'right'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.terms_accepted}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_accepted: e.target.checked }))}
                  id="terms"
                  required
                  style={{ 
                    width: '20px',
                    height: '20px',
                    marginTop: '0.2rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                    accentColor: '#e74c3c'
                  }}
                />
                <label 
                  htmlFor="terms"
                  style={{ 
                    cursor: 'pointer',
                    lineHeight: '1.6',
                    userSelect: 'none'
                  }}
                >
                  <strong>אני מצהיר/ה כי קראתי בעיון את הסכם תנאי האירוח, הבנתי את כל התחייבויותיו, ומסכים/ה לכל תנאיו ללא סייג. ידוע לי כי חתימתי מהווה הסכמה מחייבת משפטית.</strong>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <SignaturePad
                onSave={(dataUrl) => setFormData(prev => ({ ...prev, signature_data_url: dataUrl }))}
                value={formData.signature_data_url}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-outline-secondary"
                style={{ flex: 1, borderRadius: '12px', padding: '0.8rem' }}
              >
                → חזרה
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-success"
                style={{ flex: 2, borderRadius: '12px', padding: '0.8rem', fontSize: '1.1rem' }}
              >
                {submitting ? 'שולח...' : 'השלם צ\'ק-אין ✅'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Completion */}
        {currentStep === 4 && completionData && (
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              animation: 'fadeIn 0.5s',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨ 🎉 ✨</div>
            <h1 style={{ fontSize: '2rem', color: '#27ae60', marginBottom: '1rem' }}>
              הצ'ק-אין הושלם בהצלחה!
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#7f8c8d', marginBottom: '2rem' }}>
              תודה {checkInData.guest_name}, כל הפרטים נשמרו במערכת.
            </p>

            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '2rem',
                borderRadius: '16px',
                marginBottom: '2rem',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🔑 קוד כניסה לנכס</h2>
              <div
                style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                {completionData.access_code}
              </div>
              <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                הקוד נשלח גם ב-WhatsApp למספר שלך
              </p>
            </div>

            {completionData.wifi_ssid && (
              <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'right' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>📶 WiFi</h3>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>שם רשת:</strong> {completionData.wifi_ssid}
                </div>
                {completionData.wifi_password && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>סיסמה:</strong> {completionData.wifi_password}
                  </div>
                )}
                <button
                  onClick={() => copyToClipboard(completionData.wifi_password)}
                  className="btn btn-sm btn-outline-primary"
                  style={{ borderRadius: '8px' }}
                >
                  📋 העתק סיסמה
                </button>
              </div>
            )}

            {completionData.property_guide && (
              <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'right' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>📖 מדריך לנכס</h3>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {completionData.property_guide}
                </div>
              </div>
            )}

            {completionData.owner_phone && (
              <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'right' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>📞 יצירת קשר</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>בעל הנכס:</strong> {completionData.owner_phone}
                </div>
                <a
                  href={`https://wa.me/${completionData.owner_phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success"
                  style={{ borderRadius: '8px' }}
                >
                  💬 שלח הודעת WhatsApp
                </a>
              </div>
            )}

            <p style={{ color: '#7f8c8d', fontSize: '1.1rem', marginTop: '2rem' }}>
              מחכים לך! 🏡
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
