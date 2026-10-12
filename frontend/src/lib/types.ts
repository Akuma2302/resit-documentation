export type User = { id: string; name: string; email: string; role: 'ADMIN' | 'USER' }

export type Option = { id: string; name: string; active?: boolean }
export type PurposeOption = Option & { direction: string }

export type Receipt = {
  id: string
  amountCents: number
  receiptDate: string // YYYY-MM-DD
  direction: 'IN' | 'OUT'
  purposeId: string
  purposeName: string
  payerId: string | null
  payerName: string | null
  // the staff member who paid, when the payer is "Staff"; otherwise empty
  paidByName: string
  // which account an expense was paid from; empty on sales and on older receipts
  paidFromAccount: 'COMPANY' | 'PERSONAL' | ''
  // whose account, when paid from a personal one
  accountHolder: string
  accountBank: string
  accountNumber: string
  counterparty: string
  note: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  possibleDuplicate: boolean
  submittedBy: string
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}
