'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react'

interface FileUploadZoneProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSizeMB?: number
  label?: string
  description?: string
}

export default function FileUploadZone({
  onUpload,
  accept = 'image/*',
  maxSizeMB = 5,
  label = 'צילום תעודת זהות/דרכון',
  description = 'צלמו או העלו תמונה ברורה של התעודה'
}: FileUploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      setError(`הקובץ גדול מדי. גודל מקסימלי: ${maxSizeMB}MB`)
      return
    }

    // Validate file type
    const allowedTypes = accept.split(',').map(t => t.trim())
    const isValid = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'))
      }
      return file.type === type
    })

    if (!isValid) {
      setError('סוג קובץ לא נתמך. אנא העלה תמונה (JPG/PNG/HEIC)')
      return
    }

    setFileName(file.name)

    // Set file type
    if (file.type.startsWith('image/')) {
      setFileType('image')
      // Create preview for images
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'application/pdf') {
      setFileType('pdf')
      setPreview(null)
    }

    // Upload file
    setUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת הקובץ')
      setPreview(null)
      setFileName(null)
      setFileType(null)
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setPreview(null)
    setFileName(null)
    setFileType(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="file-upload-zone">
      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#2c3e50' }}>
        📸 {label}
      </h3>
      <p style={{ color: '#7f8c8d', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {description}
      </p>

      {!preview && !fileName && (
        <label
          htmlFor="file-upload"
          style={{
            display: 'block',
            border: '2px dashed #3498db',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f8f9fa',
            transition: 'all 0.3s',
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.currentTarget.style.background = '#e3f2fd'
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa'
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.style.background = '#f8f9fa'
            const file = e.dataTransfer.files?.[0]
            if (file && inputRef.current) {
              const dataTransfer = new DataTransfer()
              dataTransfer.items.add(file)
              inputRef.current.files = dataTransfer.files
              inputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
            }
          }}
        >
          <Upload size={48} style={{ color: '#3498db', marginBottom: '1rem' }} />
          <div style={{ fontSize: '1.1rem', color: '#2c3e50', marginBottom: '0.5rem' }}>
            📸 צלמו תמונה או בחרו מהגלריה
          </div>
          <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
            תמונות JPG, PNG, HEIC (עד {maxSizeMB}MB)
          </div>
          <input
            ref={inputRef}
            id="file-upload"
            type="file"
            accept={accept}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {uploading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">מעלה...</span>
          </div>
          <p style={{ marginTop: '1rem', color: '#7f8c8d' }}>מעלה קובץ...</p>
        </div>
      )}

      {preview && fileType === 'image' && !uploading && (
        <div
          style={{
            border: '2px solid #27ae60',
            borderRadius: '12px',
            padding: '1rem',
            background: '#fff',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              top: '0.5rem',
              left: '0.5rem',
              background: '#e74c3c',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              zIndex: 10,
            }}
          >
            <X size={20} />
          </button>
          <img
            src={preview}
            alt="תצוגה מקדימה"
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
          <div
            style={{
              marginTop: '1rem',
              padding: '0.8rem',
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              color: '#155724',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <ImageIcon size={20} />
            <span>✅ תמונה הועלתה בהצלחה</span>
          </div>
        </div>
      )}

      {fileName && fileType === 'pdf' && !uploading && (
        <div
          style={{
            border: '2px solid #27ae60',
            borderRadius: '12px',
            padding: '1.5rem',
            background: '#fff',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              top: '0.5rem',
              left: '0.5rem',
              background: '#e74c3c',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <X size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <FileText size={64} style={{ color: '#e74c3c', marginBottom: '1rem' }} />
            <div style={{ fontSize: '1rem', color: '#2c3e50', marginBottom: '0.5rem' }}>
              {fileName}
            </div>
            <div
              style={{
                marginTop: '1rem',
                padding: '0.8rem',
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                color: '#155724',
              }}
            >
              ✅ PDF הועלה בהצלחה
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.8rem',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            color: '#721c24',
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
