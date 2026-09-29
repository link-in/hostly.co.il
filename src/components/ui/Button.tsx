'use client';

/**
 * Hostly Design System — Button Component
 * HOS-18: create global system design
 *
 * קומפוננט כפתור מאוחד — מחליף את כל שימושי .hostly-btn ו-.hostly-btn-* ב-CSS.
 * תומך ב: variant, size, loading, disabled, icon-only, כ-link.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'ghost'
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonSurface = 'dark' | 'light';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** סגנון הכפתור */
  variant?: ButtonVariant;
  /** גודל הכפתור */
  size?: ButtonSize;
  /** האם להציג spinner טעינה */
  loading?: boolean;
  /** משטח הרקע — משפיע על הצבעים */
  surface?: ButtonSurface;
  /** אייקון בצד ימין (RTL: לפני הטקסט) */
  iconStart?: React.ReactNode;
  /** אייקון בצד שמאל (RTL: אחרי הטקסט) */
  iconEnd?: React.ReactNode;
  /** מצב icon-only — ריבוע עם אייקון בלי טקסט */
  iconOnly?: boolean;
}

// ─── Style Maps ──────────────────────────────────────────────────────────────
// הערה: הכפתור משתמש בקלאסים של hostly-buttons.css הלקוח מהמערכת הקיימת
// ואינו משתמש ב-Tailwind Utility Classes שלא נתמכים כאן במלואם.

// ─── Component ───────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      surface = 'light',
      iconStart,
      iconEnd,
      iconOnly = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClass =
      surface === 'dark'
        ? `hostly-btn-${variant}`
        : `hostly-btn-on-light hostly-btn-${variant}`;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={['hostly-btn', `hostly-btn-${size}`, iconOnly ? 'hostly-btn-icon' : '', variantClass, className].filter(Boolean).join(' ')}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : (
          iconStart && <span className="shrink-0">{iconStart}</span>
        )}

        {!iconOnly && children}

        {!loading && iconEnd && (
          <span className="shrink-0">{iconEnd}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
