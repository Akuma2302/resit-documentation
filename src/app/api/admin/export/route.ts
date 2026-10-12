import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { readFilters, receiptWhere } from '@/lib/filters'
import { directionLabel, formatDate, formatRM, statusLabel } from '@/lib/format'

const MAX_ROWS = 5000

type Row = {
  date: string
  type: string
  purpose: string
  amountCents: number
  direction: string
  paidBy: string
  counterparty: string
  note: string
  status: string
  submittedBy: string
}

async function toXlsx(rows: Row[]) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Receipts')
  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 8 },
    { header: 'Purpose', key: 'purpose', width: 18 },
    { header: 'Amount (RM)', key: 'amount', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Paid by', key: 'paidBy', width: 12 },
    { header: 'Paid to / Received from', key: 'counterparty', width: 28 },
    { header: 'Note', key: 'note', width: 36 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Submitted by', key: 'submittedBy', width: 18 },
  ]
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) sheet.addRow({ ...row, amount: row.amountCents / 100 })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function toPdf(rows: Row[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  const columns: { label: string; width: number; value: (r: Row) => string; right?: boolean }[] = [
    { label: 'Date', width: 68, value: (r) => r.date },
    { label: 'Type', width: 36, value: (r) => r.type },
    { label: 'Purpose', width: 90, value: (r) => r.purpose },
    { label: 'Amount', width: 78, value: (r) => formatRM(r.amountCents), right: true },
    { label: 'Paid by', width: 60, value: (r) => r.paidBy },
    { label: 'Paid to / from', width: 140, value: (r) => r.counterparty },
    { label: 'Note', width: 150, value: (r) => r.note },
    { label: 'Status', width: 56, value: (r) => r.status },
    { label: 'Submitted by', width: 90, value: (r) => r.submittedBy },
  ]
  const left = doc.page.margins.left
  const bottom = doc.page.height - doc.page.margins.bottom
  const rowHeight = 16

  const drawRow = (cells: string[], y: number, bold: boolean) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8)
    let x = left
    columns.forEach((col, i) => {
      doc.text(cells[i], x, y, {
        width: col.width - 6,
        height: rowHeight,
        lineBreak: false,
        ellipsis: true,
        align: col.right ? 'right' : 'left',
      })
      x += col.width
    })
  }
  const header = (y: number) => {
    drawRow(columns.map((c) => c.label), y, true)
    doc.moveTo(left, y + 11).lineTo(left + columns.reduce((sum, c) => sum + c.width, 0), y + 11).stroke('#999999')
    return y + rowHeight
  }

  const totalIn = rows.filter((r) => r.direction === 'IN').reduce((sum, r) => sum + r.amountCents, 0)
  const totalOut = rows.filter((r) => r.direction === 'OUT').reduce((sum, r) => sum + r.amountCents, 0)

  doc.font('Helvetica-Bold').fontSize(14).text('Receipts report', left, doc.page.margins.top)
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(
      `Generated ${formatDate(new Date())}  |  ${rows.length} receipts  |  Money in ${formatRM(totalIn)}  |  Money out ${formatRM(totalOut)}`,
    )

  let y = header(doc.y + 10)
  for (const row of rows) {
    if (y + rowHeight > bottom) {
      doc.addPage()
      y = header(doc.page.margins.top)
    }
    drawRow(columns.map((c) => c.value(row)), y, false)
    y += rowHeight
  }
  doc.end()
  return done
}

export async function GET(req: Request) {
  const session = await getSession()
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const params = new URL(req.url).searchParams
  const receipts = await db.receipt.findMany({
    where: receiptWhere(readFilters(params)),
    include: { purpose: true, payer: true, submittedBy: { select: { name: true } } },
    orderBy: [{ receiptDate: 'desc' }, { id: 'desc' }],
    take: MAX_ROWS,
  })
  const rows: Row[] = receipts.map((r) => ({
    date: formatDate(r.receiptDate),
    type: directionLabel(r.direction),
    purpose: r.purpose.name,
    amountCents: r.amountCents,
    direction: r.direction,
    paidBy: r.payer?.name ?? '',
    counterparty: r.counterparty,
    note: r.note,
    status: statusLabel[r.status] ?? r.status,
    submittedBy: r.submittedBy.name,
  }))

  const pdf = params.get('format') === 'pdf'
  const file = pdf ? await toPdf(rows) : await toXlsx(rows)
  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': pdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="receipts-${stamp}.${pdf ? 'pdf' : 'xlsx'}"`,
    },
  })
}
