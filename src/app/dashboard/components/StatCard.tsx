import React from 'react'

type StatCardProps = {
  title: string
  value: string
  helper?: string
}

const StatCard = ({ title, value, helper }: StatCardProps) => {
  return (
    <div 
      className="card h-100 border-0 shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        borderTop: '3px solid transparent',
        borderImage: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb) 1',
        borderRadius: '12px',
      }}
    >
      <div className="card-body p-2 p-md-3">
        <div 
          className="text-uppercase fw-semibold mb-1 mb-md-2"
          style={{
            color: 'rgba(249, 147, 251, 0.8)',
            fontSize: '0.65rem',
          }}
        >
          {title}
        </div>
        <div 
          className="fw-bold"
          style={{
            color: 'white',
            fontSize: '1.25rem',
          }}
        >
          {value}
        </div>
        {helper ? (
          <div 
            className="mt-1"
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.65rem',
            }}
          >
            {helper}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default StatCard
