/**
 * Hostly Design System — PageHeader Component
 * HOS-18: create global system design
 *
 * כותרת עמוד אחידה לכל עמודי הדשבורד.
 * כולל: כותרת ראשית, תת-כותרת, ופעולות (כפתורים) בצד שמאל (RTL).
 */

import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  /** כותרת ראשית של העמוד */
  title: string;
  /** תת-כותרת / תיאור קצר */
  subtitle?: string;
  /** אייקון ליד הכותרת */
  icon?: React.ReactNode;
  /** כפתורי פעולה — מוצגים בצד שמאל (start ב-RTL) */
  actions?: React.ReactNode;
  /** className נוסף לעיצוב */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={['d-flex align-items-center justify-content-between gap-3 mb-4', className].join(' ')}
      style={{ minHeight: '48px' }}
    >
      {/* Right side: icon + text */}
      <div className="d-flex align-items-center gap-3 text-truncate">
        {icon && (
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--hb-100)',
              color: 'var(--hb)',
            }}
          >
            {icon}
          </div>
        )}

        <div className="text-truncate">
          <h1
            className="mb-0 text-truncate"
            style={{ 
              color: 'var(--htxt-1)',
              fontSize: 'clamp(1.15rem, 3vw, 1.4rem)', 
              fontWeight: 700, 
              lineHeight: 1.2 
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <div
              className="text-truncate mt-1"
              style={{ 
                color: 'var(--htxt-3)', 
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Left side: actions */}
      {actions && (
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
