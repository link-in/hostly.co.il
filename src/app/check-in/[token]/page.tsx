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
    id_document_type: 'id_card' as 'id_card' | 'passport' | 'drivers_license',
    id_number: '',
    date_of_birth: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
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
    formDataObj.append('documentType', formData.id_document_type)

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

    if (!formData.id_number || !formData.date_of_birth || !formData.address) {
      alert('אנא מלאו את כל השדות החובה')
      return
    }

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
            id_document_type: formData.id_document_type,
            id_number: formData.id_number,
            date_of_birth: formData.date_of_birth,
            address: formData.address,
            emergency_contact_name: formData.emergency_contact_name || undefined,
            emergency_contact_phone: formData.emergency_contact_phone || undefined,
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
              פרטים אישיים והעלאת תעודה
            </h2>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label"><strong>סוג תעודה</strong></label>
              <select
                className="form-select"
                value={formData.id_document_type}
                onChange={(e) => setFormData(prev => ({ ...prev, id_document_type: e.target.value as any }))}
                style={{ borderRadius: '8px' }}
              >
                <option value="id_card">תעודת זהות</option>
                <option value="passport">דרכון</option>
                <option value="drivers_license">רישיון נהיגה</option>
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label"><strong>מספר תעודה <span style={{ color: 'red' }}>*</span></strong></label>
              <input
                type="text"
                className="form-control"
                value={formData.id_number}
                onChange={(e) => setFormData(prev => ({ ...prev, id_number: e.target.value }))}
                style={{ borderRadius: '8px' }}
                required
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label"><strong>תאריך לידה <span style={{ color: 'red' }}>*</span></strong></label>
              <input
                type="date"
                className="form-control"
                value={formData.date_of_birth}
                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                style={{ borderRadius: '8px' }}
                required
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <FileUploadZone onUpload={handleUploadId} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label"><strong>כתובת מגורים <span style={{ color: 'red' }}>*</span></strong></label>
              <textarea
                className="form-control"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                style={{ borderRadius: '8px' }}
                required
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label"><strong>איש קשר לחירום</strong></label>
              <input
                type="text"
                className="form-control mb-2"
                placeholder="שם מלא"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                style={{ borderRadius: '8px' }}
              />
              <input
                type="tel"
                className="form-control"
                placeholder="מספר טלפון"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                style={{ borderRadius: '8px' }}
              />
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
                ← חזרה
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: '12px', padding: '0.8rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
              >
                המשך →
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
                maxHeight: '300px',
                overflowY: 'auto',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                background: '#f8f9fa',
              }}
            >
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>תקנון אירוח</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li>שעת כניסה: 15:00, שעת יציאה: 11:00</li>
                <li>איסור עישון בנכס</li>
                <li>שמירה על הנכס והציוד</li>
                <li>אחריות לנזקים שייגרמו מרשלנות</li>
                <li>הנכס מצויד במצלמות אבטחה חיצוניות</li>
                <li>שמירה על שקט לילי (22:00-08:00)</li>
                {checkInData.custom_terms && (
                  <li dangerouslySetInnerHTML={{ __html: checkInData.custom_terms }} />
                )}
              </ul>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div className="form-check" style={{ marginBottom: '1rem' }}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={formData.terms_accepted}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_accepted: e.target.checked }))}
                  id="terms"
                  style={{ marginLeft: '0.5rem' }}
                />
                <label className="form-check-label" htmlFor="terms">
                  <strong>קראתי והבנתי את תנאי האירוח ואני מסכים/ה לכל האמור</strong>
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
                ← חזרה
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
