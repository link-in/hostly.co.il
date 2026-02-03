'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, CheckCircle, Clock, XCircle, Download, Send } from 'lucide-react'
import type { CheckIn } from '@/lib/check-in/types'
import { SessionProvider } from '../../SessionProvider'
import DashboardHeader from '@/components/DashboardHeader'

function CheckInDetailsPageContent() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/dashboard/login')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchCheckIn() {
      try {
        const res = await fetch(`/api/dashboard/check-ins/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setCheckIn(data)
        } else {
          alert('שגיאה בטעינת פרטי הצ\'ק-אין')
          router.push('/dashboard/check-ins')
        }
      } catch (error) {
        console.error('Error fetching check-in:', error)
        alert('שגיאה בטעינת פרטי הצ\'ק-אין')
        router.push('/dashboard/check-ins')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated' && params.id) {
      fetchCheckIn()
    }
  }, [status, params.id, router])

  const getStatusBadge = (status?: string) => {
    const currentStatus = status || checkIn?.status
    switch (currentStatus) {
      case 'completed':
        return <span className="badge bg-success fs-6"><CheckCircle size={16} /> הושלם</span>
      case 'pending':
        return <span className="badge bg-warning text-dark fs-6"><Clock size={16} /> ממתין</span>
      case 'expired':
        return <span className="badge bg-danger fs-6"><XCircle size={16} /> פג תוקף</span>
      default:
        return <span className="badge bg-secondary fs-6">{currentStatus}</span>
    }
  }

  if (loading) {
    return (
      <main 
        style={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        }} 
        dir="rtl"
      >
        <div className="container py-5">
          <div className="text-center text-white">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">טוען...</span>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!checkIn) {
    return null
  }

  return (
    <main 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }} 
      dir="rtl"
    >
      <div className="container py-3 py-md-5">
        <div className="row justify-content-center">
          <div className="col-lg-11 col-xl-10">
            <div className="mb-3 mb-md-4">
              <DashboardHeader 
                session={session}
                title={`צ'ק-אין - ${checkIn.guest_name}`}
                subtitle={new Date(checkIn.check_in_date).toLocaleDateString('he-IL')}
                showLandingPageButton={true}
                currentPage="check-ins"
              />
            </div>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-11 col-xl-10">
            {/* Back Button & Status */}
            <div className="d-flex align-items-center gap-2 mb-3">
              <button
                onClick={() => router.push('/dashboard/check-ins')}
                className="btn btn-light shadow-sm"
                style={{ borderRadius: '8px' }}
              >
                <ArrowLeft size={20} /> חזרה
              </button>
              <div className="ms-auto">{getStatusBadge()}</div>
            </div>

            <div className="row g-4">
              {/* Guest Information */}
              <div className="col-md-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div 
                    className="card-header text-white" 
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px 12px 0 0',
                      border: 'none'
                    }}
                  >
                    <h5 className="mb-0">פרטי האורח</h5>
                  </div>
            <div className="card-body">
              <table className="table table-borderless mb-0">
                <tbody>
                  <tr>
                    <td width="40%"><strong>שם מלא:</strong></td>
                    <td>{checkIn.guest_name}</td>
                  </tr>
                  <tr>
                    <td><strong>טלפון:</strong></td>
                    <td>{checkIn.guest_phone}</td>
                  </tr>
                  {checkIn.guest_email && (
                    <tr>
                      <td><strong>אימייל:</strong></td>
                      <td>{checkIn.guest_email}</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>תאריך כניסה:</strong></td>
                    <td>{new Date(checkIn.check_in_date).toLocaleDateString('he-IL')}</td>
                  </tr>
                  <tr>
                    <td><strong>תאריך יציאה:</strong></td>
                    <td>{new Date(checkIn.check_out_date).toLocaleDateString('he-IL')}</td>
                  </tr>
                  <tr>
                    <td><strong>מספר אורחים:</strong></td>
                    <td>{checkIn.num_adults + checkIn.num_children}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

              {/* Check-in Status */}
              <div className="col-md-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div 
                    className="card-header text-white"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      borderRadius: '12px 12px 0 0',
                      border: 'none'
                    }}
                  >
                    <h5 className="mb-0">מצב צ'ק-אין</h5>
                  </div>
            <div className="card-body">
              <table className="table table-borderless mb-0">
                <tbody>
                  <tr>
                    <td width="40%"><strong>סטטוס:</strong></td>
                    <td>{getStatusBadge(checkIn.status)}</td>
                  </tr>
                  <tr>
                    <td><strong>נוצר בתאריך:</strong></td>
                    <td>{new Date(checkIn.created_at).toLocaleString('he-IL')}</td>
                  </tr>
                  {checkIn.completed_at && (
                    <tr>
                      <td><strong>הושלם בתאריך:</strong></td>
                      <td>{new Date(checkIn.completed_at).toLocaleString('he-IL')}</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>תוקף:</strong></td>
                    <td>{new Date(checkIn.expires_at).toLocaleDateString('he-IL')}</td>
                  </tr>
                  {checkIn.access_code && (
                    <tr>
                      <td><strong>קוד כניסה:</strong></td>
                      <td>
                        <span className="badge bg-success fs-5">{checkIn.access_code}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Personal Details (if completed) */}
        {checkIn.status === 'completed' && (
          <>
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-secondary text-white">
                  <h5 className="mb-0">פרטים אישיים</h5>
                </div>
                <div className="card-body">
                  <table className="table table-borderless mb-0">
                    <tbody>
                      {checkIn.id_document_type && (
                        <tr>
                          <td width="40%"><strong>סוג תעודה:</strong></td>
                          <td>
                            {checkIn.id_document_type === 'id_card' && 'תעודת זהות'}
                            {checkIn.id_document_type === 'passport' && 'דרכון'}
                            {checkIn.id_document_type === 'drivers_license' && 'רישיון נהיגה'}
                          </td>
                        </tr>
                      )}
                      {checkIn.id_number && (
                        <tr>
                          <td><strong>מספר תעודה:</strong></td>
                          <td>{checkIn.id_number}</td>
                        </tr>
                      )}
                      {checkIn.date_of_birth && (
                        <tr>
                          <td><strong>תאריך לידה:</strong></td>
                          <td>{new Date(checkIn.date_of_birth).toLocaleDateString('he-IL')}</td>
                        </tr>
                      )}
                      {checkIn.address && (
                        <tr>
                          <td><strong>כתובת:</strong></td>
                          <td>{checkIn.address}</td>
                        </tr>
                      )}
                      {checkIn.actual_num_guests && (
                        <tr>
                          <td><strong>מספר אורחים בפועל:</strong></td>
                          <td>{checkIn.actual_num_guests}</td>
                        </tr>
                      )}
                      {checkIn.estimated_arrival_time && (
                        <tr>
                          <td><strong>שעת הגעה משוערת:</strong></td>
                          <td>{checkIn.estimated_arrival_time}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div 
                  className="card-header text-white"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '12px 12px 0 0',
                    border: 'none'
                  }}
                >
                  <h5 className="mb-0">איש קשר לחירום</h5>
                </div>
                <div className="card-body">
                  {checkIn.emergency_contact_name || checkIn.emergency_contact_phone ? (
                    <table className="table table-borderless mb-0">
                      <tbody>
                        {checkIn.emergency_contact_name && (
                          <tr>
                            <td width="40%"><strong>שם:</strong></td>
                            <td>{checkIn.emergency_contact_name}</td>
                          </tr>
                        )}
                        {checkIn.emergency_contact_phone && (
                          <tr>
                            <td><strong>טלפון:</strong></td>
                            <td>{checkIn.emergency_contact_phone}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-muted mb-0">לא הוזן איש קשר לחירום</p>
                  )}
                </div>
              </div>
            </div>

            {/* ID Document */}
            {checkIn.id_document_url && (
              <div className="col-12">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div 
                    className="card-header text-white"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '12px 12px 0 0',
                      border: 'none'
                    }}
                  >
                    <h5 className="mb-0">תעודת זהות</h5>
                  </div>
                  <div className="card-body text-center">
                    <img
                      src={checkIn.id_document_url}
                      alt="תעודת זהות"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '500px',
                        borderRadius: '8px',
                        border: '2px solid #dee2e6'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Digital Signature */}
            {checkIn.signature_data_url && (
              <div className="col-12">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div 
                    className="card-header text-white"
                    style={{
                      background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      borderRadius: '12px 12px 0 0',
                      border: 'none'
                    }}
                  >
                    <h5 className="mb-0">חתימה דיגיטלית</h5>
                  </div>
                  <div className="card-body">
                    <img
                      src={checkIn.signature_data_url}
                      alt="חתימה דיגיטלית"
                      style={{
                        maxWidth: '400px',
                        border: '2px solid #dee2e6',
                        borderRadius: '8px',
                        background: 'white'
                      }}
                    />
                    {checkIn.signature_timestamp && (
                      <p className="text-muted mt-2 mb-0">
                        נחתם ב: {new Date(checkIn.signature_timestamp).toLocaleString('he-IL')}
                      </p>
                    )}
                    {checkIn.ip_address && (
                      <p className="text-muted mt-1 mb-0" style={{ fontSize: '0.85rem' }}>
                        IP: {checkIn.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {checkIn.status === 'pending' && (
                  <button className="btn btn-primary">
                    <Send size={18} /> שלח קישור שוב
                  </button>
                )}
                {checkIn.status === 'completed' && (
                  <button className="btn btn-success">
                    <Download size={18} /> הורד PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckInDetailsPage() {
  return (
    <SessionProvider>
      <CheckInDetailsPageContent />
    </SessionProvider>
  )
}
