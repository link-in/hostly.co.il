'use client';

/**
 * Hostly Design System — DataTable Component
 * HOS-13 / HOS-16: אחידות טבלאות + מובייל Data Cards
 *
 * טבלה אחידה לכל עמודי הדשבורד.
 * ─ דסקטופ: טבלה רגילה עם sticky header
 * ─ מובייל (< 768px): כרטיסיות Data Cards
 *
 * כל עמוד שמשתמש בטבלה — מחליף אותה בקומפוננט הזה.
 */

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnAlign = 'start' | 'center' | 'end';

export interface ColumnDef<T> {
  /** כותרת העמודה */
  header: string;
  /** key בנתונים, או פונקציה שמחזירה React node */
  cell: keyof T | ((row: T) => React.ReactNode);
  /** יישור טקסט בעמודה */
  align?: ColumnAlign;
  /** האם להסתיר במובייל (כרטיסיות) */
  hideOnMobile?: boolean;
  /** רוחב מינימלי בעמודה (px) */
  minWidth?: number;
}

export interface DataTableProps<T> {
  /** מערך הנתונים */
  data: T[];
  /** הגדרת העמודות */
  columns: ColumnDef<T>[];
  /** key ייחודי לכל שורה */
  keyField: keyof T;
  /** מה להציג כשאין נתונים */
  emptyMessage?: string;
  /** האם להציג spinner טעינה */
  loading?: boolean;
  /** callback בלחיצה על שורה */
  onRowClick?: (row: T) => void;
  /** className נוסף */
  className?: string;
  /** כותרת ראשית לכרטיס במובייל (שדה מהנתונים) */
  mobileTitle?: keyof T | ((row: T) => React.ReactNode);
  /** תת-כותרת לכרטיס במובייל */
  mobileSubtitle?: keyof T | ((row: T) => React.ReactNode);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCellValue<T>(row: T, cell: ColumnDef<T>['cell']): React.ReactNode {
  if (typeof cell === 'function') return cell(row);
  const val = row[cell];
  if (val === null || val === undefined) return '—';
  return String(val);
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--hborder-light)' }}>
          <div
            style={{
              height: 14,
              borderRadius: 6,
              background: 'var(--hn-200)',
              width: i === 0 ? '60%' : '40%',
              animation: 'hostly-pulse 1.5s ease-in-out infinite',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Desktop Table ────────────────────────────────────────────────────────────

function DesktopTable<T>({ data, columns, keyField, emptyMessage, loading, onRowClick }: DataTableProps<T>) {
  return (
    <div
      className="dashboard-table-scroll-container"
      style={{ borderRadius: 8, border: '1px solid var(--hborder)' }}
    >
      <table
        className="hostly-dark-table table table-hover mb-0"
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.header)}
                style={{
                  textAlign: col.align ?? 'start',
                  minWidth: col.minWidth,
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  color: 'var(--htxt-3)',
                  background: 'var(--hn-50)',
                  borderBottom: '1px solid var(--hborder)',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  textAlign: 'center',
                  padding: '40px 16px',
                  color: 'var(--htxt-3)',
                  fontSize: 14,
                }}
              >
                {emptyMessage ?? 'אין נתונים להצגה'}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.header)}
                    style={{
                      textAlign: col.align ?? 'start',
                      padding: '11px 16px',
                      fontSize: 13.5,
                      color: 'var(--htxt-1)',
                      verticalAlign: 'middle',
                      borderBottom: '1px solid var(--hborder-light)',
                    }}
                  >
                    {getCellValue(row, col.cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mobile Data Card ─────────────────────────────────────────────────────────

function MobileCard<T>({ row, columns, onRowClick, mobileTitle, mobileSubtitle }: {
  row: T;
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  mobileTitle?: DataTableProps<T>['mobileTitle'];
  mobileSubtitle?: DataTableProps<T>['mobileSubtitle'];
}) {
  const visibleCols = columns.filter((c) => !c.hideOnMobile);

  const title = mobileTitle
    ? typeof mobileTitle === 'function'
      ? mobileTitle(row)
      : String(row[mobileTitle] ?? '')
    : null;

  const subtitle = mobileSubtitle
    ? typeof mobileSubtitle === 'function'
      ? mobileSubtitle(row)
      : String(row[mobileSubtitle] ?? '')
    : null;

  return (
    <div
      onClick={() => onRowClick?.(row)}
      style={{
        background: 'var(--hsurf)',
        border: '1px solid var(--hborder)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: onRowClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
        marginBottom: 10,
      }}
    >
      {/* Card header — title + subtitle */}
      {(title || subtitle) && (
        <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--hborder-light)' }}>
          {title && (
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--htxt-1)', lineHeight: 1.3 }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: 12.5, color: 'var(--htxt-3)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* Card fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {visibleCols.map((col) => (
          <div key={String(col.header)}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--htxt-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              {col.header}
            </div>
            <div style={{ fontSize: 13, color: 'var(--htxt-1)' }}>
              {getCellValue(row, col.cell)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DataTable<T>(props: DataTableProps<T>) {
  return (
    <>
      {/* --- CSS for skeleton pulse + responsive display --- */}
      <style>{`
        @keyframes hostly-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .hostly-datatable-desktop { display: block; }
        .hostly-datatable-mobile  { display: none;  }
        @media (max-width: 767px) {
          .hostly-datatable-desktop { display: none;  }
          .hostly-datatable-mobile  { display: block; }
        }
      `}</style>

      {/* Desktop: Table */}
      <div className="hostly-datatable-desktop">
        <DesktopTable {...props} />
      </div>

      {/* Mobile: Data Cards */}
      <div className="hostly-datatable-mobile">
        {props.loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--hsurf)',
                  border: '1px solid var(--hborder)',
                  borderRadius: 10,
                  padding: 16,
                  height: 100,
                  animation: 'hostly-pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : props.data.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: 'var(--htxt-3)',
            fontSize: 14,
            background: 'var(--hsurf)',
            border: '1px solid var(--hborder)',
            borderRadius: 10,
          }}>
            {props.emptyMessage ?? 'אין נתונים להצגה'}
          </div>
        ) : (
          props.data.map((row) => (
            <MobileCard
              key={String(row[props.keyField])}
              row={row}
              columns={props.columns}
              onRowClick={props.onRowClick}
              mobileTitle={props.mobileTitle}
              mobileSubtitle={props.mobileSubtitle}
            />
          ))
        )}
      </div>
    </>
  );
}
