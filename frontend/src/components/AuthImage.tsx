import { useEffect, useState } from 'react'
import { apiBlob } from '@/lib/api'

// Receipt images need the login token, which a plain <img src> cannot send,
// so the image is fetched and shown from a local object URL.
export function AuthImage({ receiptId, className }: { receiptId: string; className?: string }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

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

  if (failed) {
    return <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 ${className}`}>No image</div>
  }
  if (!url) return <div className={`animate-pulse bg-slate-100 ${className}`} />
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Receipt" className={className} />
    </a>
  )
}
