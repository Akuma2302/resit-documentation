import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getImage } from '@/lib/storage'

const CONTENT_TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const receipt = await db.receipt.findUnique({ where: { id: Number(params.id) || 0 } })
  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.role !== 'ADMIN' && receipt.submittedById !== session.userId) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const image = await getImage(receipt.imagePath)
  if (!image) return NextResponse.json({ error: 'Image missing' }, { status: 404 })
  const ext = receipt.imagePath.split('.').pop() ?? ''
  return new Response(image, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
