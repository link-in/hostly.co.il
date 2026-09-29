/**
 * Hostly Design System — Card Component
 * HOS-18: create global system design
 *
 * כרטיסיית תוכן אחידה — מחליפה את .hostly-card ו-.hostly-dark-card.
 * מורכבת מ-Card, Card.Header, Card.Body, Card.Footer.
 */

import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  /** className נוסף */
  className?: string;
  /** style נוסף */
  style?: React.CSSProperties;
  /** padding פנימי — ברירת מחדל false (ניהול ע"י תת-קומפוננטים) */
  padded?: boolean;
  /** האם להוסיף צל */
  shadow?: boolean;
}

export interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Base Card ────────────────────────────────────────────────────────────────

function CardRoot({ children, className = '', style, padded = false, shadow = false }: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border',
        padded ? 'p-4' : '',
        shadow ? 'shadow-sm' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background:   'var(--hsurf)',
        borderColor:  'var(--hborder)',
        color:        'var(--htxt-1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Card.Header ──────────────────────────────────────────────────────────────

function CardHeader({ children, className = '' }: CardSectionProps) {
  return (
    <div
      className={['px-4 py-3.5 text-sm font-medium', className].join(' ')}
      style={{
        borderBottom: '1px solid var(--hborder-light)',
        color:        'var(--htxt-1)',
      }}
    >
      {children}
    </div>
  );
}

// ─── Card.Body ────────────────────────────────────────────────────────────────

function CardBody({ children, className = '', style }: CardSectionProps) {
  return (
    <div className={['p-4', className].join(' ')} style={style}>
      {children}
    </div>
  );
}

// ─── Card.Footer ─────────────────────────────────────────────────────────────

function CardFooter({ children, className = '' }: CardSectionProps) {
  return (
    <div
      className={['px-4 py-3 flex items-center gap-2', className].join(' ')}
      style={{
        borderTop:  '1px solid var(--hborder-light)',
        background: 'var(--hsurf-2)',
      }}
    >
      {children}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
// כרטיסיית סטטיסטיקה מרכזית — תואמת hostly-dark-stat של המערכת
// שומרת על גובה אחיד במדויק (פיקסל-פרפקט) גם במובייל ובשלוש עמודות

export interface StatCardProps {
  /** תווית עליונה (תומך גם ב-title לתאימות) */
  label?: string;
  title?: string;
  /** ערך מספרי מרכזי */
  value: string | number;
  /** טקסט עזר תחתון (למשל: "3 נכשלו") */
  helper?: string;
  /** נתוני מגמה */
  trend?: { value: string; up?: boolean };
  /** אייקון אופציונלי */
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StatCard({
  label,
  title,
  value,
  helper,
  trend,
  className = '',
  style,
}: StatCardProps) {
  const displayLabel = label ?? title ?? '';
  const helperText = trend ? `${trend.up ? '↑' : '↓'} ${trend.value}` : helper;
  const helperColor = trend
    ? (trend.up ? '#15803d' : '#dc2626')
    : helper
    ? '#dc2626'
    : 'var(--htxt-3)';

  return (
    <div
      className={[
        'hostly-dark-stat rounded-3 text-center d-flex flex-column justify-content-center h-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: 'var(--hsurf)',
        border: '1px solid var(--hborder)',
        padding: '12px 8px',
        minHeight: '82px',
        ...style,
      }}
    >
      {/* תווית עליונה */}
      <div
        className="text-truncate"
        style={{
          color: 'var(--htxt-3)',
          fontSize: '0.75rem',
          fontWeight: 500,
          marginBottom: '3px',
          lineHeight: 1.2,
        }}
      >
        {displayLabel}
      </div>

      {/* ערך מרכזי */}
      <div
        style={{
          color: 'var(--htxt-1)',
          fontSize: 'clamp(1.1rem, 3.2vw, 1.35rem)',
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      {/* שורת עזר / מגמה — תמיד תופסת גובה מדויק כדי שכל הכרטיסים בשורה יהיו בגובה אחיד */}
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          marginTop: '3px',
          lineHeight: '14px',
          minHeight: '14px',
          color: helperColor,
          visibility: helperText ? 'visible' : 'hidden',
        }}
        aria-hidden={!helperText}
      >
        {helperText || '—'}
      </div>
    </div>
  );
}

// ─── Compound Export ──────────────────────────────────────────────────────────

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body:   CardBody,
  Footer: CardFooter,
});
