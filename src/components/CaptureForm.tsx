'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { parseReceiptText } from '@/lib/ocr'
import { ReceiptFields, type Option, type PurposeOption, type ReceiptValues } from './ReceiptFields'

const MAX_SIDE = 1800

// Phone photos are huge; shrink them so the scan and the upload stay fast.
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read image'))), 'image/jpeg', 0.85),
  )
}

function today() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

type Props = { purposes: PurposeOption[]; payers: Option[] }

export function CaptureForm({ purposes, payers }: Props) {
  const router = useRouter()
  const cameraInput = useRef<HTMLInputElement>(null)
  const uploadInput = useRef<HTMLInputElement>(null)

  const [image, setImage] = useState<Blob | null>(null)
  const [preview, setPreview] = useState('')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scanNote, setScanNote] = useState('')
  const [values, setValues] = useState<ReceiptValues>({
    amount: '',
    date: today(),
    purposeId: '',
    payerId: '',
    counterparty: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState('')

  useEffect(() => () => URL.revokeObjectURL(preview), [preview])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setDuplicate('')
    setScanNote('')
    setScanning(true)
    setProgress(0)
    try {
      const blob = await shrinkImage(file)
      setImage(blob)
      setPreview(URL.createObjectURL(blob))

      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const { data } = await worker.recognize(blob)
      await worker.terminate()

      const scan = parseReceiptText(data.text)
      setValues((v) => ({
        ...v,
        amount: scan.amount || v.amount,
        date: scan.date || v.date,
        counterparty: scan.vendor || v.counterparty,
      }))
      setScanNote(
        scan.amount
          ? 'Price filled in from the receipt. Check it before saving.'
          : 'Could not read the price from this photo. Please type it in.',
      )
    } catch {
      setScanNote('Scanning failed. Please fill in the details yourself.')
    } finally {
      setScanning(false)
    }
  }

  async function save(confirmDuplicate: boolean) {
    if (!image) return
    setSaving(true)
    setError('')
    const body = new FormData()
    body.set('image', new File([image], 'receipt.jpg', { type: 'image/jpeg' }))
    for (const [key, value] of Object.entries(values)) body.set(key, value)
    if (confirmDuplicate) body.set('confirmDuplicate', 'yes')
    try {
      const res = await fetch('/api/receipts', { method: 'POST', body })
      const json = await res.json()
      if (res.status === 409 && json.duplicate) {
        setDuplicate(json.duplicate)
      } else if (!res.ok) {
        setError(json.error ?? 'Could not save the receipt.')
      } else {
        router.push('/?saved=1')
        router.refresh()
        return
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    }
    setSaving(false)
  }

  const pickers = (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={uploadInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  )

  if (!image) {
    return (
      <div className="card space-y-3 text-center">
        {pickers}
        <p className="text-sm text-slate-600">Take a photo of the receipt or upload one from your device.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button className="btn" onClick={() => cameraInput.current?.click()} disabled={scanning}>
            Take photo
          </button>
          <button className="btn-secondary" onClick={() => uploadInput.current?.click()} disabled={scanning}>
            Upload image
          </button>
        </div>
        {scanning && <p className="text-sm text-slate-500">Preparing image…</p>}
        {scanNote && <p className="text-sm text-red-700">{scanNote}</p>}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pickers}
      <div className="card space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Receipt" className="mx-auto max-h-[28rem] rounded-lg object-contain" />
        <button
          className="btn-secondary w-full"
          onClick={() => uploadInput.current?.click()}
          disabled={scanning || saving}
        >
          Use a different photo
        </button>
      </div>

      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save(false)
        }}
      >
        {scanning ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Scanning receipt… {progress > 0 ? `${progress}%` : ''}
          </p>
        ) : (
          scanNote && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{scanNote}</p>
        )}

        <ReceiptFields purposes={purposes} payers={payers} values={values} onChange={setValues} />

        {error && <p className="text-sm text-red-700">{error}</p>}

        {duplicate ? (
          <div className="space-y-3 rounded-lg border border-orange-300 bg-orange-50 p-3">
            <p className="text-sm text-orange-900">{duplicate}</p>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => save(true)} disabled={saving}>
                Save anyway
              </button>
              <button type="button" className="btn-secondary" onClick={() => router.push('/')} disabled={saving}>
                Discard
              </button>
            </div>
          </div>
        ) : (
          <button className="btn w-full" disabled={scanning || saving}>
            {saving ? 'Saving…' : 'Save receipt'}
          </button>
        )}
      </form>
    </div>
  )
}
