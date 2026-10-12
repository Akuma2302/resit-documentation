'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { endSession, requireAdmin, startSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { findDuplicate, parseReceiptFields } from '@/lib/receipts'

export type FormState = { error?: string; ok?: string }

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'Wrong email or password.' }
  }
  await startSession({ userId: user.id, name: user.name, role: user.role === 'ADMIN' ? 'ADMIN' : 'USER' })
  redirect(user.role === 'ADMIN' ? '/admin' : '/')
}

export async function logout() {
  endSession()
  redirect('/login')
}

// ----- Receipts (admin) -----

export async function reviewReceipt(form: FormData) {
  const admin = await requireAdmin()
  const id = Number(form.get('id'))
  const status = String(form.get('status'))
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) return
  await db.receipt.update({
    where: { id },
    data:
      status === 'PENDING'
        ? { status, reviewedById: null, reviewedAt: null }
        : { status, reviewedById: admin.userId, reviewedAt: new Date() },
  })
  revalidatePath('/admin', 'layout')
}

export async function updateReceipt(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const id = Number(form.get('id'))
  const parsed = await parseReceiptFields(form)
  if ('error' in parsed) return { error: parsed.error }
  const duplicate = await findDuplicate(parsed.data, id)
  await db.receipt.update({ where: { id }, data: { ...parsed.data, possibleDuplicate: Boolean(duplicate) } })
  revalidatePath('/admin', 'layout')
  return { ok: 'Changes saved.' }
}

// ----- Settings (admin) -----

export async function addPurpose(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const name = String(form.get('name') ?? '').trim()
  const direction = form.get('direction') === 'IN' ? 'IN' : 'OUT'
  if (!name) return { error: 'Enter a name.' }
  if (await db.purpose.findUnique({ where: { name } })) return { error: 'That purpose already exists.' }
  await db.purpose.create({ data: { name, direction } })
  revalidatePath('/admin/settings')
  return { ok: `Added "${name}".` }
}

export async function addPayer(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const name = String(form.get('name') ?? '').trim()
  if (!name) return { error: 'Enter a name.' }
  if (await db.payer.findUnique({ where: { name } })) return { error: 'That payer already exists.' }
  await db.payer.create({ data: { name } })
  revalidatePath('/admin/settings')
  return { ok: `Added "${name}".` }
}

// Lists are switched off rather than deleted so old receipts keep their labels.
export async function toggleActive(form: FormData) {
  const admin = await requireAdmin()
  const id = Number(form.get('id'))
  const active = form.get('active') === 'true'
  const kind = String(form.get('kind'))
  if (kind === 'purpose') await db.purpose.update({ where: { id }, data: { active } })
  if (kind === 'payer') await db.payer.update({ where: { id }, data: { active } })
  if (kind === 'user' && id !== admin.userId) await db.user.update({ where: { id }, data: { active } })
  revalidatePath('/admin/settings')
}

export async function addUser(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  const role = form.get('role') === 'ADMIN' ? 'ADMIN' : 'USER'
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a name and a valid email.' }
  if (password.length < 8) return { error: 'The password needs at least 8 characters.' }
  if (await db.user.findUnique({ where: { email } })) return { error: 'That email is already registered.' }
  await db.user.create({ data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) } })
  revalidatePath('/admin/settings')
  return { ok: `Added ${name}.` }
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const password = String(form.get('password') ?? '')
  if (password.length < 8) return { error: 'The password needs at least 8 characters.' }
  await db.user.update({
    where: { id: Number(form.get('id')) },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  })
  return { ok: 'Password changed.' }
}
