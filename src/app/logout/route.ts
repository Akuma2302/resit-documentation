import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/token'

// Clears the cookie for sessions that are no longer valid (for example a deactivated account).
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/login', req.url))
  res.cookies.delete(SESSION_COOKIE)
  return res
}
