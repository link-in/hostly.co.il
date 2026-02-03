'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import DashboardHeader from '@/components/DashboardHeader'

type Customer = {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  firstBookingDate: string
  lastBookingDate: string
  totalBookings: number
  bookingSource: string
}

// Helper function to get platform icon/logo based on source
const getPlatformIcon = (source: string | null | undefined, size: number = 24) => {
  const sourceLower = (source || '').toLowerCase()
  
  // Container style to ensure consistent sizing
  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0
  }
  
  if (sourceLower.includes('airbnb')) {
    // Airbnb logo
    return (
      <div style={containerStyle}>
        <img 
          src="/airbnb-logo.png" 
          alt="Airbnb" 
          style={{ 
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover'
          }} 
        />
      </div>
    )
  }
  if (sourceLower.includes('booking')) {
    // Booking.com logo
    return (
      <div style={containerStyle}>
        <img 
          src="/booking-logo.png" 
          alt="Booking.com" 
          style={{ 
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover'
          }} 
        />
      </div>
    )
  }
  if (sourceLower.includes('agoda')) {
    return <div style={containerStyle}><span style={{ fontSize: `${size}px`, lineHeight: 1 }}>🗺️</span></div>
  }
  if (sourceLower.includes('expedia')) {
    return <div style={containerStyle}><span style={{ fontSize: `${size}px`, lineHeight: 1 }}>✈️</span></div>
  }
  if (sourceLower.includes('vrbo') || sourceLower.includes('homeaway')) {
    return <div style={containerStyle}><span style={{ fontSize: `${size}px`, lineHeight: 1 }}>🏡</span></div>
  }
  if (sourceLower.includes('tripadvisor')) {
    return <div style={containerStyle}><span style={{ fontSize: `${size}px`, lineHeight: 1 }}>🦉</span></div>
  }
  if (sourceLower.includes('hotels.com')) {
    return <div style={containerStyle}><span style={{ fontSize: `${size}px`, lineHeight: 1 }}>🏨</span></div>
  }
  // הזמנה ישירה או לא מוכר
  return <div style={containerStyle}><span style={{ fontSize: `${size}px`, lineHeight: 1 }}>🌐</span></div>
}

// Helper function to get source label text
const getSourceLabel = (source: string) => {
  const lowerSource = source.toLowerCase()
  if (lowerSource.includes('airbnb')) return 'Airbnb'
  if (lowerSource.includes('booking')) return 'Booking'
  if (lowerSource === 'direct') return 'ישירות'
  if (lowerSource.includes('agoda')) return 'Agoda'
  if (lowerSource.includes('expedia')) return 'Expedia'
  if (lowerSource.includes('vrbo') || lowerSource.includes('homeaway')) return 'VRBO'
  if (lowerSource.includes('tripadvisor')) return 'TripAdvisor'
  if (lowerSource.includes('hotels.com')) return 'Hotels.com'
  return source || 'ישירות'
}

export default function CustomersClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [importing, setImporting] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/dashboard/login')
    }
  }, [status, router])

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/dashboard/customers')
        if (!response.ok) {
          throw new Error('Failed to fetch customers')
        }
        const data = await response.json()
        setCustomers(data.customers || [])
        setFilteredCustomers(data.customers || [])
      } catch (error) {
        console.error('Error fetching customers:', error)
        toast.error('שגיאה בטעינת לקוחות')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchCustomers()
    }
  }, [status])

  // Filter customers based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = customers.filter(customer =>
        customer.fullName.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
      )
      setFilteredCustomers(filtered)
    }
  }, [searchQuery, customers])

  // Import customers from Beds24
  const handleImportFromBeds24 = () => {
    if (importing) return

    toast.warning(
      'ייבא לקוחות מ-Beds24?',
      {
        description: 'כל ההזמנות הקיימות יומרו ללקוחות. תהליך זה עשוי לקחת מספר דקות.',
        duration: 10000,
        action: {
          label: '✓ ייבא',
          onClick: async () => {
            setImporting(true)
            await performImport()
          },
        },
        cancel: {
          label: '✕ ביטול',
          onClick: () => {},
        },
      }
    )
  }

  const performImport = async () => {
    // Show loading toast and save its ID
    const loadingToastId = toast.loading('מייבא לקוחות מ-Beds24...', {
      duration: Infinity,
    })

    try {
      const response = await fetch('/api/dashboard/customers/import', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()
      
      // Dismiss the loading toast
      toast.dismiss(loadingToastId)
      
      // Show success toast
      toast.success('ייבוא הושלם בהצלחה!', {
        description: `${result.stats.customersImported} לקוחות נוספו/עודכנו מתוך ${result.stats.totalBookings} הזמנות`,
        duration: 3000,
      })

      // Wait a moment for user to see the success message, then reload
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error importing customers:', error)
      
      // Dismiss the loading toast
      toast.dismiss(loadingToastId)
      
      // Show error toast
      toast.error('ייבוא נכשל', {
        description: 'אנא נסה שוב מאוחר יותר',
        duration: 4000,
      })
    } finally {
      setImporting(false)
    }
  }

  // Export to CSV
  const handleExport = () => {
    if (filteredCustomers.length === 0) {
      toast.warning('אין נתונים לייצוא')
      return
    }

    // Create CSV content
    const headers = ['שם מלא', 'טלפון', 'אימייל', 'מקור הזמנה', 'תאריך הזמנה ראשונה', 'תאריך הזמנה אחרונה']
    const rows = filteredCustomers.map(customer => [
      customer.fullName,
      customer.phone || '',
      customer.email || '',
      getSourceLabel(customer.bookingSource),
      new Date(customer.firstBookingDate).toLocaleDateString('he-IL'),
      new Date(customer.lastBookingDate).toLocaleDateString('he-IL')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Add BOM for Hebrew support in Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('הקובץ יוצא בהצלחה')
  }

  if (status === 'loading' || loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="container py-3 py-md-5">
          <div className="mb-3 mb-md-4">
            <DashboardHeader 
              session={session} 
              currentPage="customers" 
              showLandingPageButton={true}
            />
          </div>
        </div>
        <div className="container pb-5">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <div className="card-body text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">טוען...</span>
              </div>
              <p className="text-muted mb-0">טוען נתוני לקוחות...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div className="container py-3 py-md-5">
        <div className="mb-3 mb-md-4">
          <DashboardHeader 
            session={session} 
            currentPage="customers" 
            showLandingPageButton={true}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container pb-5">
        {/* Title and Stats */}
        <div className="mb-4">
          <h2 
            className="h5 fw-bold mb-2"
            style={{
              color: 'rgba(249, 147, 251, 0.9)',
            }}
          >
            רשימת לקוחות
          </h2>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
            {searchQuery 
              ? `מציג ${filteredCustomers.length} מתוך ${customers.length} לקוחות`
              : `סה"כ ${customers.length} לקוחות`
            }
          </div>
        </div>

        {/* Search and Actions Card */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
          <div className="card-body p-3 p-md-4">
            <div className="row g-3 align-items-center">
              <div className="col-12 col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 חיפוש לפי שם, טלפון או אימייל..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    borderRadius: '8px',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                  }}
                />
              </div>
              <div className="col-12 col-md-6 d-flex gap-2 justify-content-end">
                {/* Import Button */}
                <button
                  className="btn"
                  onClick={handleImportFromBeds24}
                  disabled={importing}
                  style={{ 
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!importing) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {importing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      מייבא...
                    </>
                  ) : (
                    '📥 ייבוא לקוחות'
                  )}
                </button>
                
                {/* Export Button */}
                <button
                  className="btn"
                  onClick={handleExport}
                  disabled={filteredCustomers.length === 0}
                  style={{ 
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    border: 'none',
                    color: 'white',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (filteredCustomers.length > 0) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(67, 233, 123, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  📊 ייצוא לאקסל
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table Card */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <div className="card-body p-0">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-5">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {searchQuery ? '🔍' : '👥'}
                </div>
                <p className="text-muted mb-0">
                  {searchQuery ? 'לא נמצאו לקוחות תואמים לחיפוש' : 'עדיין אין לקוחות במערכת'}
                </p>
                {!searchQuery && (
                  <p className="text-muted small mt-2">
                    לקוחות יתווספו אוטומטית כשתיצור הזמנות חדשות
                  </p>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ background: 'rgba(102, 126, 234, 0.05)' }}>
                    <tr>
                      <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#667eea' }}>
                        שם מלא
                      </th>
                      <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#667eea' }}>
                        טלפון
                      </th>
                      <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#667eea' }}>
                        אימייל
                      </th>
                      <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#667eea' }}>
                        מקור
                      </th>
                      <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#667eea' }}>
                        הזמנה ראשונה
                      </th>
                      <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#667eea' }}>
                        הזמנה אחרונה
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr 
                        key={customer.id}
                        style={{ transition: 'background-color 0.2s' }}
                      >
                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                          <strong style={{ color: '#333' }}>{customer.fullName}</strong>
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                          {customer.phone ? (
                            <a 
                              href={`tel:${customer.phone}`} 
                              className="text-decoration-none"
                              style={{ color: '#667eea' }}
                            >
                              {customer.phone}
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                          {customer.email ? (
                            <a 
                              href={`mailto:${customer.email}`} 
                              className="text-decoration-none"
                              style={{ color: '#667eea' }}
                            >
                              {customer.email}
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            minHeight: '24px'
                          }}>
                            {getPlatformIcon(customer.bookingSource, 24)}
                            <span style={{ lineHeight: '24px' }}>{getSourceLabel(customer.bookingSource)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' }}>
                          {new Date(customer.firstBookingDate).toLocaleDateString('he-IL')}
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' }}>
                          {new Date(customer.lastBookingDate).toLocaleDateString('he-IL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster 
        position="top-center" 
        richColors 
        closeButton 
        dir="rtl"
        toastOptions={{
          style: {
            fontFamily: 'inherit',
          },
        }}
      />
    </main>
  )
}
