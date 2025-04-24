import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the user from session storage
  const user = request.cookies.get('user')
  const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register'
  const isDashboardPage = request.nextUrl.pathname === '/dashboard'
  const isHomePage = request.nextUrl.pathname === '/'

  // If user is not logged in and trying to access dashboard
  if (!user && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in and trying to access auth pages
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is logged in and on home page, redirect to dashboard
  if (user && isHomePage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/', '/login', '/register', '/dashboard']
} 