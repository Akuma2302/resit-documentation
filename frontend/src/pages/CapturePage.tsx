import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ReceiptFields, type ReceiptValues } from '@/components/ReceiptFields'
import { api, ApiError } from '@/lib/api'
import { parseReceiptText } from '@/lib/ocr'
import type { Option, PurposeOption } from '@/lib/types'
import { useApi } from '@/lib/useApi'

const MAX_SIDE = 1800

// Phone photos are huge; shrink them so the scan and the upload stay fast.
// Decodes through an <img>, which every phone browser supports and which applies the
// photo's rotation. Older iOS versions cannot createImageBitmap() a camera file.
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

async function shrinkImage(file: File): Promise<Blob> {
  const source = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(source.naturalWidth, source.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.naturalWidth * scale)
  canvas.height = Math.round(source.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read image'))), 'image/jpeg', 0.85),
  )
}

function today() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

const crumbs = [{ label: 'My Receipts', href: '/' }, { label: 'Camera' }]

export function CapturePage() {
  const navigate = useNavigate()
  const options = useApi<{ purposes: PurposeOption[]; payers: Option[] }>('/api/options')
  const purposes = options.data?.purposes ?? []
  const payers = options.data?.payers ?? []
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
    paidByName: '',
    counterparty: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState('')

  useEffect(() => () => URL.revokeObjectURL(preview), [preview])

  async function handleFile(file: File | undefined) {
    // clear the pickers so choosing the same photo again still fires a change
    if (cameraInput.current) cameraInput.current.value = ''
    if (uploadInput.current) uploadInput.current.value = ''
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
      await api('/api/receipts', { method: 'POST', form: body })
      navigate('/?saved=1')
      return
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && typeof e.data.duplicate === 'string') setDuplicate(e.data.duplicate)
      else setError(e instanceof Error ? e.message : 'Could not save the receipt.')
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
      {/* image/* rather than a fixed list, so iPhone HEIC photos can be picked; they are converted to JPEG before upload */}
      <input
        ref={uploadInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  )

  if (!image) {
    return (
      <div>
        <PageHeader title="New Receipt" crumbs={crumbs} />
      <div className="card mx-auto max-w-xl space-y-4 py-10 text-center">
        {pickers}
        <h2 className="card-title mb-0">Scan a receipt</h2>
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
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="New Receipt" crumbs={crumbs} />
    <div className="grid gap-4 md:grid-cols-2">
      {pickers}
      <div className="card space-y-3">
        <h2 className="card-title">Receipt image</h2>
        <img src={preview} alt="Receipt" className="mx-auto max-h-64 rounded-lg object-contain md:max-h-[28rem]" />
        <button
          className="btn-secondary w-full"
          onClick={() => uploadInput.current?.click()}
          disabled={scanning || saving}
        >
          Use a different photo
        </button>
      </div>

      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault()
          save(false)
        }}
      >
        <h2 className="panel-head">Receipt details</h2>
        <div className="panel-body space-y-4">
        {scanning ? (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Scanning receipt… {progress > 0 ? `${progress}%` : ''}
          </p>
        ) : (
          scanNote && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{scanNote}</p>
        )}

        <ReceiptFields purposes={purposes} payers={payers} values={values} onChange={setValues} />

        {options.error && <p className="text-sm text-red-700">{options.error}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}

        {duplicate ? (
          <div className="space-y-3 rounded-lg border border-orange-300 bg-orange-50 p-3">
            <p className="text-sm text-orange-900">{duplicate}</p>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => save(true)} disabled={saving}>
                Save anyway
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/')} disabled={saving}>
                Discard
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-success w-full" disabled={scanning || saving}>
            {saving ? 'Saving…' : 'Save receipt'}
          </button>
        )}
        </div>
      </form>
    </div>
    </div>
  )
}
