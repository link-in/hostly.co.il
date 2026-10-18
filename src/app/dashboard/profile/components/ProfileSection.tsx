import type { ReactNode } from 'react'

interface ProfileSectionProps {
  id: string
  title: string
  description?: string
  icon: ReactNode
  children: ReactNode
}

/** כרטיס מקטע אחיד: אייקון, כותרת, תיאור ותוכן. ה-id משמש לניווט הצדדי. */
export function ProfileSection({ id, title, description, icon, children }: ProfileSectionProps) {
  const titleId = `${id}-title`
  return (
    <section id={id} className="profile-section" aria-labelledby={titleId}>
      <header className="profile-section-header">
        <div className="profile-section-icon" aria-hidden="true">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 id={titleId} className="profile-section-title">
            {title}
          </h2>
          {description ? <p className="profile-section-desc">{description}</p> : null}
        </div>
      </header>
      <div className="profile-section-body">{children}</div>
    </section>
  )
}

interface ProfileGroupProps {
  title?: string
  hint?: string
  children: ReactNode
}

/** קבוצה פנימית בתוך מקטע — מפרידה בין נושאים באותו כרטיס. */
export function ProfileGroup({ title, hint, children }: ProfileGroupProps) {
  return (
    <div className="profile-group">
      {title ? <h3 className="profile-group-title">{title}</h3> : null}
      {hint ? <p className="profile-group-hint">{hint}</p> : null}
      {children}
    </div>
  )
}
