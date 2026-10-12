import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { UPLOAD_DIR } from '@/lib/receipts'

const CONTENT_TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const receipt = await db.receipt.findUnique({ where: { id: Number(params.id) || 0 } })
  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.role !== 'ADMIN' && receipt.submittedById !== session.userId) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  try {
    // basename guards against a stored path ever pointing outside the upload folder
    const file = await readFile(path.join(UPLOAD_DIR, path.basename(receipt.imagePath)))
    const ext = receipt.imagePath.split('.').pop() ?? ''
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Image missing' }, { status: 404 })
  }
}
