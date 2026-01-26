'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface AdminUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  displayName: string
  propertyId: string
  roomId: string
  landingPageUrl?: string
  phoneNumber?: string
  role: 'admin' | 'owner'
  beds24Token?: string
  beds24RefreshToken?: string
  createdAt: string
  updatedAt: string
}

interface UserFormData {
  email: string
  password: string
  firstName: string
  lastName: string
  displayName: string
  propertyId: string
  roomId: string
  landingPageUrl?: string
  phoneNumber?: string
  role: 'admin' | 'owner'
  beds24Token?: string
  beds24RefreshToken?: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    displayName: '',
    propertyId: '',
    roomId: '',
    landingPageUrl: '',
    phoneNumber: '',
    role: 'owner',
    beds24Token: '',
    beds24RefreshToken: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/dashboard/login')
      return
    }
    if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Fetch users
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    try {
      setSubmitting(true)
      setError(null)

      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      
      const method = editingUser ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save user')
      }

      // Reset form and refresh
      setShowForm(false)
      setEditingUser(null)
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        displayName: '',
        propertyId: '',
        roomId: '',
        landingPageUrl: '',
        phoneNumber: '',
        beds24Token: '',
        beds24RefreshToken: '',
        role: 'owner',
      })
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '', // Don't pre-fill password
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      displayName: user.displayName,
      propertyId: user.propertyId,
      roomId: user.roomId,
      landingPageUrl: user.landingPageUrl || '',
      phoneNumber: user.phoneNumber || '',
      beds24Token: user.beds24Token || '',
      beds24RefreshToken: user.beds24RefreshToken || '',
      role: user.role,
    })
    setShowForm(true)
  }

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userEmail}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingUser(null)
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      displayName: '',
      propertyId: '',
      roomId: '',
      landingPageUrl: '',
      phoneNumber: '',
      beds24Token: '',
      beds24RefreshToken: '',
      role: 'owner',
    })
    setError(null)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (session?.user?.role !== 'admin') {
    return null
  }

  return (
    <div className="container py-5" style={{ maxWidth: '1400px', direction: 'rtl' }}>
      {/* Header with Logo */}
      <div 
        className="d-flex flex-column flex-md-row align-items-center justify-content-between mb-4 p-4"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
          <img
            src="/photos/hostly-logo.png"
            alt="Hostly"
            style={{ height: '48px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <h3 
            className="mb-0"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 'bold',
            }}
          >
            ניהול משתמשים - HOSTLY
          </h3>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
            }}
            onClick={() => router.push('/admin/users/create')}
          >
            + הוסף לקוח חדש
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <div 
          className="card-body"
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(249, 147, 251, 0.05) 100%)',
          }}
        >

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError(null)}
              ></button>
            </div>
          )}

          {showForm && (
            <div className="card mb-4 border-0 bg-white" style={{ borderRadius: '12px' }}>
              <div 
                className="card-header"
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(249, 147, 251, 0.1) 100%)',
                  borderRadius: '12px 12px 0 0',
                }}
              >
                <h5 
                  className="mb-0"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 'bold',
                  }}
                >
                  {editingUser ? 'ערוך משתמש' : 'משתמש חדש'}
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">אימייל *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        סיסמה {editingUser ? '(השאר ריק לשמור קיימת)' : '*'}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                        placeholder={editingUser ? 'השאר ריק לשמור קיימת' : ''}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">שם פרטי *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">שם משפחה *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">שם תצוגה *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        required
                        placeholder="שם מלא לתצוגה"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">טלפון</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Property ID *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.propertyId}
                        onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Room ID *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.roomId}
                        onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">כתובת אתר נחיתה</label>
                      <input
                        type="url"
                        className="form-control"
                        value={formData.landingPageUrl}
                        onChange={(e) => setFormData({ ...formData, landingPageUrl: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">תפקיד *</label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'owner' })}
                      >
                        <option value="owner">בעל יחידה (Owner)</option>
                        <option value="admin">אדמין (Admin)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <hr className="my-3" />
                      <h6 className="text-muted mb-3">🔑 Beds24 API Tokens (אופציונלי)</h6>
                      <div className="alert alert-info small">
                        <strong>💡 טיפ:</strong> אם ללקוח יש חשבון Beds24 נפרד, הכנס את הטוקנים שלו כאן. אחרת, השאר ריק והמערכת תשתמש בטוקן הגלובלי.
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Beds24 Access Token</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.beds24Token || ''}
                        onChange={(e) => setFormData({ ...formData, beds24Token: e.target.value })}
                        placeholder="אופציונלי - רק אם חשבון נפרד"
                      />
                      <small className="text-muted">השאר ריק לשמור קיים או להשתמש בגלובלי</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Beds24 Refresh Token</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.beds24RefreshToken || ''}
                        onChange={(e) => setFormData({ ...formData, beds24RefreshToken: e.target.value })}
                        placeholder="אופציונלי - רק אם חשבון נפרד"
                      />
                      <small className="text-muted">השאר ריק לשמור קיים או להשתמש בגלובלי</small>
                    </div>
                  </div>

                  <div className="mt-3 d-flex gap-2">
                    <button 
                      type="submit" 
                      className="btn"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                      }}
                      disabled={submitting}
                    >
                      {submitting ? 'שומר...' : (editingUser ? 'עדכן' : 'צור משתמש')}
                    </button>
                    <button 
                      type="button" 
                      className="btn"
                      style={{
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        backgroundColor: 'transparent',
                      }}
                      onClick={handleCancel}
                      disabled={submitting}
                    >
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-responsive bg-white rounded-3">
            <table className="table table-hover mb-0">
              <thead>
                <tr 
                  style={{
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(249, 147, 251, 0.1) 100%)',
                  }}
                >
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>שם מלא</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>אימייל</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>טלפון</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>Property ID</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>Room ID</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>תפקיד</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="fw-bold">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.displayName}
                      </div>
                      {user.firstName && user.lastName && user.displayName && (
                        <small className="text-muted">{user.displayName}</small>
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phoneNumber || '-'}</td>
                    <td><code>{user.propertyId}</code></td>
                    <td><code>{user.roomId}</code></td>
                    <td>
                      <span 
                        className="badge"
                        style={{
                          background: user.role === 'admin' 
                            ? 'linear-gradient(135deg, #764ba2 0%, #f093fb 100%)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                        }}
                      >
                        {user.role === 'admin' ? 'אדמין' : 'בעל יחידה'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm me-2"
                        style={{
                          border: '1px solid #667eea',
                          color: '#667eea',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#667eea'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = '#667eea'
                        }}
                        onClick={() => handleEdit(user)}
                      >
                        ערוך
                      </button>
                      <button 
                        className="btn btn-sm"
                        style={{
                          border: '1px solid #dc3545',
                          color: '#dc3545',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc3545'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = '#dc3545'
                        }}
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={user.id === session?.user?.id}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !loading && (
            <div className="text-center text-muted py-4">
              אין משתמשים במערכת
            </div>
          )}
        </div>
      </div>

      {/* Back to Admin Dashboard */}
      <div className="row mt-4">
        <div className="col-12 text-center">
          <a 
            href="/admin" 
            className="btn"
            style={{
              border: '1px solid white',
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            ← חזור ללוח בקרה אדמין
          </a>
        </div>
      </div>
    </div>
  )
}
