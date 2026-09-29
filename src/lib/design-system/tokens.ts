/**
 * Hostly Design System — Design Tokens
 * HOS-18: create global system design
 *
 * קובץ קבועים מרכזי — כל צבע, פונט, גודל וצל מוגדרים כאן.
 * משקף בדיוק את משתני ה-CSS ב-dashboard-surfaces.css
 * לשימוש ב-TypeScript / Tailwind className / inline styles.
 */

// ─── צבעי מותג (Brand Purple) ───────────────────────────────────────────────
export const colors = {
  brand: {
    DEFAULT: '#7133D9',   // --hb
    50:      '#F7F5FF',   // --hb-50
    100:     '#EFEBFF',   // --hb-100
    200:     '#E7E1FF',   // --hb-200
    hover:   '#5D22BD',   // --hb-hover
  },

  // ─── ניטרלי ─────────────────────────────────────────────────────────────
  neutral: {
    50:  '#F8FAFB',   // --hn-50  (רקע ראשי)
    100: '#F2F6FA',   // --hn-100
    200: '#E4EAF0',   // --hn-200
    300: '#CED7E0',   // --hn-300
    600: '#6C7884',   // --hn-600
    700: '#5B6670',   // --hn-700
    900: '#2F3133',   // --hn-900
  },

  // ─── טקסט ───────────────────────────────────────────────────────────────
  text: {
    primary:   '#2F3133',   // --htxt-1
    secondary: '#5B6670',   // --htxt-2
    muted:     '#6C7884',   // --htxt-3
    info:      '#457AE5',   // --hinfo (hover links)
  },

  // ─── משטחים ─────────────────────────────────────────────────────────────
  surface: {
    DEFAULT: '#FFFFFF',   // --hsurf (כרטיסים, מודלים)
    2:       '#F8FAFB',   // --hsurf-2 (סיידבר, רקע)
  },

  // ─── גבולות ─────────────────────────────────────────────────────────────
  border: {
    DEFAULT: '#CED7E0',   // --hborder
    light:   '#F2F6FA',   // --hborder-light
  },

  // ─── סמנטי ──────────────────────────────────────────────────────────────
  semantic: {
    success:     '#22C55E',
    successLight:'#DCFCE7',
    danger:      '#EF4444',
    dangerLight: '#FEE2E2',
    warning:     '#F59E0B',
    warningLight:'#FEF3C7',
    info:        '#3B82F6',
    infoLight:   '#DBEAFE',
  },
} as const;

// ─── פונטים ─────────────────────────────────────────────────────────────────
export const typography = {
  fontFamily: {
    /**
     * הפונט הרשמי של Hostly — Heebo.
     * נטען ב-layout.tsx עם next/font/google ומוזרק כ-var(--font-heebo).
     * שימוש: font-family: var(--font-heebo), Heebo, system-ui, sans-serif
     */
    primary: "var(--font-heebo), Heebo, system-ui, sans-serif",
  },

  fontSize: {
    xs:   '11px',
    sm:   '12px',
    base: '14px',
    md:   '15px',
    lg:   '16px',
    xl:   '18px',
    '2xl':'20px',
    '3xl':'24px',
  },

  fontWeight: {
    regular:   400,
    medium:    500,
    semibold:  600,
    bold:      700,
  },

  lineHeight: {
    tight:  1.2,
    normal: 1.4,
    loose:  1.6,
  },
} as const;

// ─── ריווח ───────────────────────────────────────────────────────────────────
export const spacing = {
  0:  '0px',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// ─── עיגולי פינות ────────────────────────────────────────────────────────────
export const radius = {
  sm:   '6px',
  md:   '8px',
  lg:   '10px',
  xl:   '12px',
  full: '9999px',
} as const;

// ─── צללים ──────────────────────────────────────────────────────────────────
export const shadows = {
  sm:  '0 1px 2px rgba(0,0,0,0.05)',
  md:  '0 2px 8px rgba(0,0,0,0.06)',
  lg:  '0 4px 16px rgba(0,0,0,0.08)',
  card:'0 1px 3px rgba(0,0,0,0.04), 0 1px 8px rgba(0,0,0,0.04)',
} as const;

// ─── מידות layout ────────────────────────────────────────────────────────────
export const layout = {
  sidebarWidth:    '224px',
  bottomNavHeight: '60px',
  headerHeight:    '64px',
  breakpoints: {
    mobile: '767px',
    tablet: '991px',
    desktop:'992px',
  },
} as const;

// ─── Transition ──────────────────────────────────────────────────────────────
export const transitions = {
  fast:   'all 0.15s ease',
  normal: 'all 0.2s ease',
  slow:   'all 0.3s ease',
} as const;

// ─── Export מאוחד ────────────────────────────────────────────────────────────
export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  layout,
  transitions,
} as const;

export type DesignTokens = typeof tokens;
