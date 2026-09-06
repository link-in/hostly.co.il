'use client'

import { signOut } from 'next-auth/react'
import { useState, useCallback } from 'react'
import DashboardBottomNav from './DashboardBottomNav'
import DashboardSideDrawer, { type DashboardPage } from './DashboardSideDrawer'

interface DashboardHeaderProps {
  session: any
  title?: string
  subtitle?: string
  showLandingPageButton?: boolean
  currentPage?: DashboardPage
}

export default function DashboardHeader({
  session,
  showLandingPageButton = true,
  currentPage = 'dashboard',
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: false })
    window.location.href = '/'
  }, [])

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const openMenu = useCallback(() => setMenuOpen(true), [])

  return (
    <>
      {/* Mobile bottom nav — desktop uses the persistent sidebar */}
      <DashboardBottomNav currentPage={currentPage} onMoreClick={openMenu} />

      <DashboardSideDrawer
        open={menuOpen}
        onClose={closeMenu}
        session={session}
        currentPage={currentPage}
        showLandingPageButton={showLandingPageButton}
        onLogout={handleLogout}
      />
    </>
  )
}
