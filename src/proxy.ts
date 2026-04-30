import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  
  // Redirect app root to dashboard. Production app domain: app.hostly.co.il
  const cleanHostname = hostname.split(':')[0]
  const isAppDomain = cleanHostname === 'app.hostly.co.il' || cleanHostname === 'hostly.co.il' || cleanHostname === 'www.hostly.co.il'
  if (isAppDomain && path === '/') {
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
  // Admin Protection
  // =========================================
  if (path.startsWith('/admin')) {
    // Try to get token with explicit cookie name
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token'
    })

    // Temporary debug logging
    console.log('🔍 [Middleware Debug]', {
      path,
      hasToken: !!token,
      tokenRole: token?.role,
      email: token?.email,
      secretExists: !!process.env.NEXTAUTH_SECRET,
      secretLength: process.env.NEXTAUTH_SECRET?.length,
      nodeEnv: process.env.NODE_ENV,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      allCookies: request.cookies.getAll().map(c => c.name)
    })

    // Not authenticated
    if (!token) {
      console.log('❌ No token found - redirecting to login')
      return NextResponse.redirect(new URL('/dashboard/login', request.url))
    }

    // Not admin
    if (token.role !== 'admin') {
      console.log('❌ Not admin role:', token.role, '- redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    console.log('✅ Admin access granted')
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
