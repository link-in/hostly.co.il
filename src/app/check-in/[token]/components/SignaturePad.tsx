'use client'

import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  value?: string
}

export default function SignaturePad({ onSave, value }: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (value && sigPadRef.current) {
      sigPadRef.current.fromDataURL(value)
      setIsEmpty(false)
      setSaved(true)
    }
  }, [value])

  const handleClear = () => {
    sigPadRef.current?.clear()
    setIsEmpty(true)
    setSaved(false)
  }

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataUrl = sigPadRef.current.toDataURL('image/png')
      onSave(dataUrl)
      setSaved(true)
    }
  }

  const handleBegin = () => {
    setIsEmpty(false)
    setSaved(false)
  }

  return (
    <div className="signature-pad-container">
      <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#2c3e50' }}>
        ✍️ חתימה דיגיטלית
      </h3>
      <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
        אנא חתמו באזור המסומן למטה
      </p>

      <div 
        style={{
          border: '2px solid #3498db',
          borderRadius: '12px',
          padding: '8px',
          background: '#fff',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            style: {
              width: '100%',
              height: '200px',
              touchAction: 'none',
            }
          }}
          backgroundColor="white"
          penColor="black"
          onBegin={handleBegin}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="btn btn-outline-secondary"
          style={{
            borderRadius: '8px',
            padding: '0.6rem 1.5rem',
            opacity: isEmpty ? 0.5 : 1,
          }}
        >
          🗑️ נקה
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty || saved}
          className="btn btn-primary"
          style={{
            borderRadius: '8px',
            padding: '0.6rem 1.5rem',
            background: saved ? '#27ae60' : '#3498db',
            border: 'none',
            opacity: isEmpty ? 0.5 : 1,
          }}
        >
          {saved ? '✅ נשמר' : '💾 שמור חתימה'}
        </button>
      </div>

      {saved && (
        <div 
          style={{
            marginTop: '1rem',
            padding: '0.8rem',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            color: '#155724',
            textAlign: 'center',
          }}
        >
          ✅ החתימה נשמרה בהצלחה
        </div>
      )}
    </div>
  )
}
