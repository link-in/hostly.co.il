'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps?: number
}

export default function ProgressBar({ currentStep, totalSteps = 4 }: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100

  const steps = [
    { number: 1, label: 'ברוכים הבאים' },
    { number: 2, label: 'פרטים אישיים' },
    { number: 3, label: 'חתימה' },
    { number: 4, label: 'סיום' },
  ]

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          background: '#e0e0e0',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3498db, #2ecc71)',
            transition: 'width 0.5s ease',
            borderRadius: '10px',
          }}
        />
      </div>

      {/* Step indicators */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          direction: 'rtl',
        }}
      >
        {steps.map((step) => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number
          const isPending = currentStep < step.number

          return (
            <div
              key={step.number}
              style={{
                flex: 1,
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isCompleted
                    ? '#2ecc71'
                    : isCurrent
                    ? '#3498db'
                    : '#e0e0e0',
                  color: isCompleted || isCurrent ? 'white' : '#95a5a6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  margin: '0 auto',
                  transition: 'all 0.3s',
                  border: isCurrent ? '3px solid #3498db' : 'none',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(52, 152, 219, 0.2)' : 'none',
                }}
              >
                {isCompleted ? '✓' : step.number}
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.85rem',
                  color: isCompleted || isCurrent ? '#2c3e50' : '#95a5a6',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                }}
              >
                {step.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
