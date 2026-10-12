import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/token'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next()
  }
  if (!session) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && session.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
