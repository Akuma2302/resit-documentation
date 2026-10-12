// All calls to the backend go through here so the login token is attached in one place.

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'resit_token'

export const LOGOUT_EVENT = 'resit:logout'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable (private mode): the session just will not survive a reload
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

type Options = { method?: string; json?: unknown; form?: FormData }

async function request(path: string, { method = 'GET', json, form }: Options = {}) {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (json !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: form ?? (json !== undefined ? JSON.stringify(json) : undefined) })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    // an expired or revoked token sends the user back to the login page
    if (res.status === 401 && token) {
      setToken(null)
      window.dispatchEvent(new Event(LOGOUT_EVENT))
    }
    throw new ApiError(typeof data.error === 'string' ? data.error : 'Something went wrong.', res.status, data)
  }
  return res
}

export async function api<T>(path: string, options?: Options): Promise<T> {
  return (await request(path, options)).json()
}

export async function apiBlob(path: string): Promise<Blob> {
  return (await request(path)).blob()
}

// Downloads need the token too, so they are fetched and then handed to the browser.
export async function downloadFile(path: string, fallbackName: string) {
  const res = await request(path)
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
