'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, Download, Send, UserCheck } from 'lucide-react'
import type { CheckIn } from '@/lib/check-in/types'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { Button, Card, PageHeader } from '@/components/ui'
import CheckInStatusBadge from '../components/CheckInStatusBadge'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ID_DOCUMENT_LABELS: Record<string, string> = {
  id_card: 'תעודת זהות',
  passport: 'דרכון',
  drivers_license: 'רישיון נהיגה',
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('he-IL')
const formatDateTime = (iso: string) => new Date(iso).toLocaleString('he-IL')

interface DetailRow {
  label: string
  value: React.ReactNode
}

/** רשימת שדות "תווית — ערך" בתוך כרטיס. שורות עם ערך ריק מוסתרות. */
function DetailsList({ rows }: { rows: (DetailRow | false | null | undefined | '' | 0)[] }) {
  const visible = rows.filter(Boolean) as DetailRow[]
  return (
    <dl className="mb-0">
      {visible.map((row, i) => (
        <div
          key={row.label}
          className="d-flex gap-3 py-2"
          style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hborder-light)', fontSize: 14 }}
        >
          <dt style={{ width: '40%', margin: 0, fontWeight: 500, color: 'var(--htxt-3)' }}>{row.label}</dt>
          <dd style={{ margin: 0, color: 'var(--htxt-1)' }}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="h-100">
      <Card.Header>{title}</Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CheckInDetailsPageContent() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchCheckIn() {
      try {
        const res = await fetch(`/api/dashboard/check-ins/${params.id}`)
        if (res.ok) {
          setCheckIn(await res.json())
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

  if (loading) {
    return (
      <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
        <DashboardHeader session={session} currentPage="check-ins" />
        <div className="container-fluid py-3 py-md-4">
          <DashboardLoader variant="section" label="טוען פרטי צ'ק-אין…" minHeight={280} />
        </div>
      </main>
    )
  }

  if (!checkIn) {
    return null
  }

  const isCompleted = checkIn.status === 'completed'
  const hasEmergencyContact = checkIn.emergency_contact_name || checkIn.emergency_contact_phone

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <DashboardHeader session={session} currentPage="check-ins" />

      <div className="container-fluid py-3 py-md-4 px-3 px-md-4">
        <PageHeader
          title={`צ'ק-אין — ${checkIn.guest_name}`}
          subtitle={formatDate(checkIn.check_in_date)}
          icon={<UserCheck size={20} />}
          actions={
            <>
              <CheckInStatusBadge status={checkIn.status} />
              <Button
                variant="ghost"
                size="sm"
                iconStart={<ArrowRight size={14} />}
                onClick={() => router.push('/dashboard/check-ins')}
              >
                חזרה
              </Button>
            </>
          }
        />

        <div className="row g-3 g-md-4">
          <div className="col-md-6">
            <SectionCard title="פרטי האורח">
              <DetailsList
                rows={[
                  { label: 'שם מלא', value: checkIn.guest_name },
                  { label: 'טלפון', value: checkIn.guest_phone },
                  checkIn.guest_email && { label: 'אימייל', value: checkIn.guest_email },
                  { label: 'תאריך כניסה', value: formatDate(checkIn.check_in_date) },
                  { label: 'תאריך יציאה', value: formatDate(checkIn.check_out_date) },
                  { label: 'מספר אורחים', value: checkIn.num_adults + checkIn.num_children },
                ]}
              />
            </SectionCard>
          </div>

          <div className="col-md-6">
            <SectionCard title="מצב צ'ק-אין">
              <DetailsList
                rows={[
                  { label: 'סטטוס', value: <CheckInStatusBadge status={checkIn.status} /> },
                  { label: 'נוצר בתאריך', value: formatDateTime(checkIn.created_at) },
                  checkIn.completed_at && { label: 'הושלם בתאריך', value: formatDateTime(checkIn.completed_at) },
                  { label: 'תוקף', value: formatDate(checkIn.expires_at) },
                  checkIn.access_code && {
                    label: 'קוד כניסה',
                    value: (
                      <code
                        style={{
                          padding: '2px 10px',
                          borderRadius: 6,
                          background: 'var(--hb-100)',
                          color: 'var(--hb)',
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        {checkIn.access_code}
                      </code>
                    ),
                  },
                ]}
              />
            </SectionCard>
          </div>

          {isCompleted && (
            <>
              <div className="col-md-6">
                <SectionCard title="פרטים אישיים">
                  <DetailsList
                    rows={[
                      checkIn.id_document_type && {
                        label: 'סוג תעודה',
                        value: ID_DOCUMENT_LABELS[checkIn.id_document_type] ?? checkIn.id_document_type,
                      },
                      checkIn.id_number && { label: 'מספר תעודה', value: checkIn.id_number },
                      checkIn.date_of_birth && { label: 'תאריך לידה', value: formatDate(checkIn.date_of_birth) },
                      checkIn.address && { label: 'כתובת', value: checkIn.address },
                      checkIn.actual_num_guests && { label: 'מספר אורחים בפועל', value: checkIn.actual_num_guests },
                      checkIn.estimated_arrival_time && {
                        label: 'שעת הגעה משוערת',
                        value: checkIn.estimated_arrival_time,
                      },
                    ]}
                  />
                </SectionCard>
              </div>

              <div className="col-md-6">
                <SectionCard title="איש קשר לחירום">
                  {hasEmergencyContact ? (
                    <DetailsList
                      rows={[
                        checkIn.emergency_contact_name && { label: 'שם', value: checkIn.emergency_contact_name },
                        checkIn.emergency_contact_phone && { label: 'טלפון', value: checkIn.emergency_contact_phone },
                      ]}
                    />
                  ) : (
                    <p className="mb-0" style={{ color: 'var(--htxt-3)', fontSize: 14 }}>
                      לא הוזן איש קשר לחירום
                    </p>
                  )}
                </SectionCard>
              </div>

              {checkIn.id_document_url && (
                <div className="col-12">
                  <SectionCard title="תעודת זהות">
                    <div className="text-center">
                      <img
                        src={checkIn.id_document_url}
                        alt="תעודת זהות"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 500,
                          borderRadius: 8,
                          border: '1px solid var(--hborder)',
                        }}
                      />
                    </div>
                  </SectionCard>
                </div>
              )}

              {checkIn.signature_data_url && (
                <div className="col-12">
                  <SectionCard title="חתימה דיגיטלית">
                    <img
                      src={checkIn.signature_data_url}
                      alt="חתימה דיגיטלית"
                      style={{
                        maxWidth: 400,
                        width: '100%',
                        border: '1px solid var(--hborder)',
                        borderRadius: 8,
                        background: 'var(--hsurf)',
                      }}
                    />
                    {checkIn.signature_timestamp && (
                      <p className="mt-2 mb-0" style={{ color: 'var(--htxt-3)', fontSize: 13 }}>
                        נחתם ב: {formatDateTime(checkIn.signature_timestamp)}
                      </p>
                    )}
                    {checkIn.ip_address && (
                      <p className="mt-1 mb-0" style={{ color: 'var(--htxt-3)', fontSize: 12 }}>
                        IP: {checkIn.ip_address}
                      </p>
                    )}
                  </SectionCard>
                </div>
              )}
            </>
          )}

          {(isCompleted || checkIn.status === 'pending') && (
            <div className="col-12">
              <Card>
                <Card.Footer className="justify-content-end">
                  {isCompleted && (
                    <Button
                      variant="success"
                      iconStart={<Download size={16} />}
                      onClick={() => {
                        /* TODO: Generate PDF */
                      }}
                    >
                      הורד PDF
                    </Button>
                  )}
                  {checkIn.status === 'pending' && (
                    <Button
                      variant="primary"
                      iconStart={<Send size={16} />}
                      onClick={() => {
                        /* TODO: Resend */
                      }}
                    >
                      שלח שוב
                    </Button>
                  )}
                </Card.Footer>
              </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function CheckInDetailsPage() {
  return <CheckInDetailsPageContent />
}
