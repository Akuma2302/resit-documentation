import { useEffect, useState } from 'react'
import { apiBlob } from '@/lib/api'

// `block` stretches the thumbnail to the width of its container.
type Props = { receiptId: string; className?: string; block?: boolean }

// Receipt images need the login token, which a plain <img src> cannot send,
// so the image is fetched and shown from a local object URL.
// Tapping it opens a full-screen viewer: phones (iOS in particular) cannot reliably
// open an object URL in a new tab.
export function AuthImage({ receiptId, className, block }: Props) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false
    setUrl('')
    setFailed(false)
    apiBlob(`/api/receipts/${receiptId}/image`)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [receiptId])

  // while the viewer is open: Escape closes it and the page behind does not scroll
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  if (failed) {
    return <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 ${className}`}>No image</div>
  }
  if (!url) return <div className={`animate-pulse bg-slate-100 ${className}`} />
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="View receipt image" className={block ? 'block w-full' : 'block shrink-0'}>
        <img src={url} alt="Receipt" className={className} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Receipt image"
          className="fixed inset-0 z-50 flex flex-col bg-black/90 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          onClick={() => setOpen(false)}
        >
          <div className="flex justify-end p-2">
            <button type="button" className="min-h-[44px] rounded-md px-4 text-sm font-semibold text-white active:bg-white/20">
              Close
            </button>
          </div>
          {/* pinch-zoom is allowed here so small print on the receipt can be read */}
          <div className="flex-1 overflow-auto p-2" style={{ touchAction: 'pinch-zoom pan-x pan-y' }}>
            <img src={url} alt="Receipt" className="mx-auto max-w-full" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </>
  )
}
