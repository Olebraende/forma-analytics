import { isCategoryId, getCategory } from '@/data/categories'
import type { Budget, FinanceData, RecordSource, SavingsGoal, Transaction } from '@/types/models'
import { isValidISODate } from '@/utils/dates'

const MAX_MINOR = 999_999_999_999
const MAX_TEXT = 200

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isMinor = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= MAX_MINOR

/** Strips control characters and collapses whitespace. Output is always rendered as text, never HTML. */
export function cleanText(v: unknown, max = MAX_TEXT): string {
  if (typeof v !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

const isSource = (v: unknown): v is RecordSource => v === 'demo' || v === 'user'
const validId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v)

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

export function parseTransaction(raw: unknown): Parsed<Transaction> {
  if (!isPlainObject(raw)) return { ok: false, error: 'Not an object' }
  if (!validId(raw.id)) return { ok: false, error: 'Invalid id' }
  if (raw.type !== 'income' && raw.type !== 'expense') return { ok: false, error: 'Invalid type' }
  if (!isMinor(raw.amount)) return { ok: false, error: 'Invalid amount' }
  if (typeof raw.categoryId !== 'string' || !isCategoryId(raw.categoryId)) return { ok: false, error: 'Unknown category' }
  if (getCategory(raw.categoryId).type !== raw.type) return { ok: false, error: 'Category does not match type' }
  if (typeof raw.date !== 'string' || !isValidISODate(raw.date)) return { ok: false, error: 'Invalid date' }
  const description = cleanText(raw.description)
  if (!description) return { ok: false, error: 'Missing description' }
  return {
    ok: true,
    value: {
      id: raw.id,
      type: raw.type,
      amount: raw.amount,
      categoryId: raw.categoryId,
      date: raw.date,
      description,
      source: isSource(raw.source) ? raw.source : 'user',
      createdAt: typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : new Date(0).toISOString(),
    },
  }
}

export function parseBudget(raw: unknown): Parsed<Budget> {
  if (!isPlainObject(raw)) return { ok: false, error: 'Not an object' }
  if (!validId(raw.id)) return { ok: false, error: 'Invalid id' }
  if (typeof raw.categoryId !== 'string' || !isCategoryId(raw.categoryId) || getCategory(raw.categoryId).type !== 'expense')
    return { ok: false, error: 'Invalid category' }
  if (!isMinor(raw.limit)) return { ok: false, error: 'Invalid limit' }
  return { ok: true, value: { id: raw.id, categoryId: raw.categoryId, limit: raw.limit, source: isSource(raw.source) ? raw.source : 'user' } }
}

export function parseGoal(raw: unknown): Parsed<SavingsGoal> {
  if (!isPlainObject(raw)) return { ok: false, error: 'Not an object' }
  if (!validId(raw.id)) return { ok: false, error: 'Invalid id' }
  const name = cleanText(raw.name, 80)
  if (!name) return { ok: false, error: 'Missing name' }
  if (!isMinor(raw.target)) return { ok: false, error: 'Invalid target' }
  const saved = raw.saved
  if (typeof saved !== 'number' || !Number.isSafeInteger(saved) || saved < 0 || saved > MAX_MINOR) return { ok: false, error: 'Invalid saved amount' }
  let targetDate: string | undefined
  if (raw.targetDate !== undefined && raw.targetDate !== null && raw.targetDate !== '') {
    if (typeof raw.targetDate !== 'string' || !isValidISODate(raw.targetDate)) return { ok: false, error: 'Invalid target date' }
    targetDate = raw.targetDate
  }
  return { ok: true, value: { id: raw.id, name, target: raw.target, saved, ...(targetDate ? { targetDate } : {}), source: isSource(raw.source) ? raw.source : 'user' } }
}

export interface ParsedImport {
  data: FinanceData
  errors: string[]
}

/** Validates an untrusted `data` payload record by record; invalid rows are reported and dropped. */
export function parseFinanceData(raw: unknown, limit = 50_000): ParsedImport {
  const errors: string[] = []
  const data: FinanceData = { transactions: [], budgets: [], goals: [] }
  if (!isPlainObject(raw)) return { data, errors: ['Missing "data" section'] }
  const run = <T>(key: string, list: unknown, parse: (r: unknown) => Parsed<T>, into: T[]) => {
    if (list === undefined) return
    if (!Array.isArray(list)) {
      errors.push(`"${key}" must be a list`)
      return
    }
    if (list.length > limit) {
      errors.push(`"${key}" has too many entries (max ${limit})`)
      return
    }
    const ids = new Set<string>()
    list.forEach((item, i) => {
      const r = parse(item)
      if (!r.ok) {
        if (errors.length < 20) errors.push(`${key} #${i + 1}: ${r.error}`)
        return
      }
      const id = (r.value as { id: string }).id
      if (ids.has(id)) {
        if (errors.length < 20) errors.push(`${key} #${i + 1}: duplicate id`)
        return
      }
      ids.add(id)
      into.push(r.value)
    })
  }
  run('transactions', raw.transactions, parseTransaction, data.transactions)
  run('budgets', raw.budgets, parseBudget, data.budgets)
  run('goals', raw.goals, parseGoal, data.goals)
  return { data, errors }
}

/* ---------- Form validation ---------- */

export type FormErrors<K extends string> = Partial<Record<K, string>>
