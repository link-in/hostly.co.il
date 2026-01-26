import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  
  // =========================================
  // Redirect hostly.co.il root to dashboard
  // =========================================
  const cleanHostname = hostname.split(':')[0] // הסר port
  if ((cleanHostname === 'hostly.co.il' || cleanHostname === 'www.hostly.co.il') && path === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // =========================================
  // Subdomain Handling - Landing Pages
  // =========================================
  const subdomain = extractSubdomain(hostname)
  
  if (subdomain && !isReservedSubdomain(subdomain)) {
    // רק עבור דפים ציבוריים (לא api, _next, dashboard, admin)
    if (
      !path.startsWith('/api') && 
      !path.startsWith('/_next') && 
      !path.startsWith('/dashboard') && 
      !path.startsWith('/admin')
    ) {
      // Rewrite to dynamic [site] route
      const url = request.nextUrl.clone()
      // dalit.hostly.co.il/ -> /dalit
      // dalit.hostly.co.il/about -> /dalit/about
      url.pathname = `/${subdomain}${path}`
      return NextResponse.rewrite(url)
    }
  }
  
  // =========================================
  // Admin Protection (existing)
  // =========================================
  if (path.startsWith('/admin')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    // Not authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/dashboard/login', request.url))
    }

    // Not admin
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0] // הסר port
  
  // localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return null
  }
  
  // Vercel deployment URLs - לא subdomain
  if (host.endsWith('.vercel.app')) {
    return null
  }
  
  // Extract subdomain ONLY from hostly.co.il
  // dalit.hostly.co.il -> dalit
  // hostly.co.il -> null
  // mountain-view-dafna.co.il -> null (זה דומיין מלא, לא subdomain)
  
  // בדוק אם זה hostly.co.il או subdomain שלו
  if (host.endsWith('.hostly.co.il')) {
    // dalit.hostly.co.il -> dalit
    const subdomain = host.replace('.hostly.co.il', '')
    return subdomain
  }
  
  // אם זה hostly.co.il עצמו או דומיין אחר - אין subdomain
  return null
}

function isReservedSubdomain(subdomain: string): boolean {
  const reserved = [
    'www',
    'api',
    'admin',
    'dashboard',
    'app',
    'mail',
    'ftp',
    'webmail',
    'test',
    'dev',
    'staging'
  ]
  
  return reserved.includes(subdomain.toLowerCase())
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
