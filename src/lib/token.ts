import { SignJWT, jwtVerify } from 'jose'

// Kept free of next/headers so middleware can import it.

export const SESSION_COOKIE = 'resit_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export type Session = { userId: number; name: string; role: 'ADMIN' | 'USER' }

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(value)
}

export async function signSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret())
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return { userId: Number(payload.userId), name: String(payload.name), role: payload.role as Session['role'] }
  } catch {
    return null
  }
}
