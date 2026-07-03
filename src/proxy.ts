import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Target admin routes and admin api endpoints
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // If no token exists, redirect to login (or return 401 for API)
    if (!token) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'Please log in to access the admin panel.')
      loginUrl.searchParams.set('callbackUrl', path)
      return NextResponse.redirect(loginUrl)
    }

    // If token exists but role is not admin, redirect with forbidden error (or return 403 for API)
    if (token.role !== 'admin') {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'forbidden')
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// Config matchers to capture any paths under /admin and /api/admin
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
