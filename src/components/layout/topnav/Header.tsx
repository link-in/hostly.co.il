'use client'

import useScrollEvent from '@/hook/useScrollEvent'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Container } from 'react-bootstrap'

interface MenuItem {
  title: string
  href?: string
  submenu?: { title: string; href: string }[]
}

const menuData: MenuItem[] = [
  {
    title: 'Home',
    href: '#home',
    submenu: [
      { title: 'Home Light', href: '/home/light' },
      { title: 'Home Image', href: '/home/image' },
      { title: 'Home Dark', href: '/home/dark' },
    ],
  },
  { title: 'About', href: '/about' },
  {
    title: 'Portfolio',
    href: '#portfolio',
    submenu: [
      { title: 'Masonry', href: '/portfolio/masonry' },
      { title: 'Grid', href: '/portfolio/grid' },
    ],
  },
  { title: 'Services', href: '/service' },
  {
    title: 'Blog',
    href: '#blog',
    submenu: [
      { title: 'Classic', href: '/blog/classic' },
      { title: 'Single', href: '/blog/single' },
      { title: 'Grid', href: '/blog/grid' },
    ],
  },
  { title: 'Contact', href: '/contact' },
  {
    title: 'Shop',
    href: '#shop',
    submenu: [
      { title: 'Shop Layout', href: '/shop/layout' },
      { title: 'Shop Details', href: '/shop/detail' },
      { title: 'My Account', href: '/shop/account' },
    ],
  },
]

const Header = () => {
  const { scrollY } = useScrollEvent()
  const [navOpen, setNavOpen] = useState(false)
  const toggleNav = () => setNavOpen(!navOpen)

  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleSubmenu = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <>
      <header id="topnav" className={`defaultscroll fixed-top navbar-sticky bg-white border-bottom ${scrollY > 100 && 'darkheader'}`}>
        <Container>
          <div>
            <Link href="" className="logo">
              נוף הרים בדפנה
            </Link>
          </div>
          <div className="menu-extras">
            <div className="menu-item">
              {/* לוגו במובייל במקום כפתור התפריט */}
              <div className="mobile-logo" style={{ display: 'none' }}>
                <Link href="/">
                  <Image 
                    src="/photos/logo.png" 
                    alt="נוף הרים בדפנה" 
                    width={120} 
                    height={60}
                    style={{ objectFit: 'contain', width: '100%' }}
                  />
                </Link>
              </div>
              {/* כפתור תפריט (מוסתר במובייל) */}
              <Link href="" className={`navbar-toggle ${navOpen ? 'open' : ''}`} onClick={toggleNav} style={{ cursor: 'pointer' }}>
                <div className="lines">
                  <span />
                  <span />
                  <span />
                </div>
              </Link>
            </div>
          </div>
          <div id="navigation" className={`${navOpen ? 'open' : ''}`}>
            <ul className="navigation-menu">
              {menuData.map((item, index) => (
                <li key={index} className={`has-submenu ${openIndex === index ? 'active open' : ''}`}>
                  <Link
                    href={item.href || '#'}
                    onClick={(e) => {
                      if (item.submenu) {
                        e.preventDefault()
                        toggleSubmenu(index)
                      }
                    }}>
                    {item.title}
                  </Link>
                  {item.submenu && <span className="menu-arrow"></span>}
                  {item.submenu && (
                    <ul className={`submenu ${openIndex === index ? 'open' : ''}`}>
                      {item.submenu.map((sub, i) => (
                        <li key={i}>
                          <Link href={sub.href}>{sub.title}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </header>
    </>
  )
}

export default Header
