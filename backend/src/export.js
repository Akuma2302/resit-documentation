const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')
const { directionLabel, formatDate, formatRM, statusLabel } = require('./format')

// Flattens receipts (loaded with receiptInclude) into export rows.
function toRows(receipts) {
  return receipts.map((r) => ({
    date: formatDate(r.receiptDate),
    type: directionLabel(r.direction),
    purpose: r.purpose.name,
    amountCents: r.amountCents,
    direction: r.direction,
    paidBy: r.payer ? (r.paidByName ? `${r.payer.name} (${r.paidByName})` : r.payer.name) : '',
    counterparty: r.counterparty,
    note: r.note,
    status: statusLabel[r.status] ?? r.status,
    submittedBy: r.submittedBy.name,
  }))
}

async function toXlsx(rows) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Receipts')
  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 8 },
    { header: 'Purpose', key: 'purpose', width: 18 },
    { header: 'Amount (RM)', key: 'amount', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Paid by', key: 'paidBy', width: 22 },
    { header: 'Paid to / Received from', key: 'counterparty', width: 28 },
    { header: 'Note', key: 'note', width: 36 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Submitted by', key: 'submittedBy', width: 18 },
  ]
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) sheet.addRow({ ...row, amount: row.amountCents / 100 })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function toPdf(rows) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  const columns = [
    { label: 'Date', width: 68, value: (r) => r.date },
    { label: 'Type', width: 36, value: (r) => r.type },
    { label: 'Purpose', width: 90, value: (r) => r.purpose },
    { label: 'Amount', width: 78, value: (r) => formatRM(r.amountCents), right: true },
    { label: 'Paid by', width: 90, value: (r) => r.paidBy },
    { label: 'Paid to / from', width: 125, value: (r) => r.counterparty },
    { label: 'Note', width: 135, value: (r) => r.note },
    { label: 'Status', width: 56, value: (r) => r.status },
    { label: 'Submitted by', width: 90, value: (r) => r.submittedBy },
  ]
  const left = doc.page.margins.left
  const bottom = doc.page.height - doc.page.margins.bottom
  const rowHeight = 16

  const drawRow = (cells, y, bold) => {
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
  const header = (y) => {
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

module.exports = { toRows, toXlsx, toPdf }
