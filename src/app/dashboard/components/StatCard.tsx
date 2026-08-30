import React from 'react'

type StatCardProps = {
  title: string
  value: string
  helper?: string
}

const StatCard = ({ title, value, helper }: StatCardProps) => {
  return (
    <div 
      className="card h-100"
      style={{
        background: '#fff',
        border: '1px solid #CED7E0',
        borderRadius: '8px',
        boxShadow: 'none',
      }}
    >
      <div className="card-body p-2 p-md-3">
        <div 
          className="text-uppercase fw-semibold mb-1 mb-md-2"
          style={{
            color: '#6C7884',
            fontSize: '0.65rem',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </div>
        <div 
          className="fw-bold"
          style={{
            color: '#2F3133',
            fontSize: '1.15rem',
          }}
        >
          {value}
        </div>
        {helper ? (
          <div 
            className="mt-1"
            style={{
              color: '#6C7884',
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
