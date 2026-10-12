import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from './db'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type Session } from './token'

export async function getSession() {
  return verifySession(cookies().get(SESSION_COOKIE)?.value)
}

export async function requireUser(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  // the cookie outlives a deactivation, so confirm the account is still active
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { active: true, role: true } })
  if (!user?.active) redirect('/logout')
  return { ...session, role: user.role === 'ADMIN' ? 'ADMIN' : 'USER' }
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser()
  if (session.role !== 'ADMIN') redirect('/')
  return session
}

export async function startSession(session: Session) {
  cookies().set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export function endSession() {
  cookies().delete(SESSION_COOKIE)
}
