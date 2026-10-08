import { getCategory } from '@/data/categories'
import { parseFinanceData, isPlainObject } from '@/finance/validation'
import { APP_ID, SCHEMA_VERSION, type ExportFile, type FinanceData, type Transaction } from '@/types/models'
import { minorToInput } from '@/utils/money'

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024

export function buildExport(data: FinanceData, now = new Date()): ExportFile {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data }
}

/** Neutralises spreadsheet formula injection and quotes cells for RFC 4180 CSV. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function transactionsToCsv(txs: Transaction[]): string {
  const header = ['date', 'type', 'category', 'description', 'amount', 'source']
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.type, getCategory(t.categoryId).name, t.description, minorToInput(t.amount), t.source].map(csvCell).join(','))
  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}

const fingerprint = (t: Transaction) => `${t.date}|${t.type}|${t.amount}|${t.categoryId}|${t.description.toLowerCase()}`

export interface ImportPreview {
  incoming: FinanceData
  /** Records that would be added in merge mode. */
  fresh: FinanceData
  duplicates: number
  errors: string[]
  schemaVersion: number
}

export type ImportResult = { ok: true; preview: ImportPreview } | { ok: false; error: string }

/** Parses and validates an untrusted export file. Never throws. */
export function previewImport(text: string, existing: FinanceData): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  if (!isPlainObject(json) || json.app !== APP_ID) return { ok: false, error: 'This does not look like a Forma Analytics export.' }
  const version = json.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return { ok: false, error: 'The file has no valid schema version.' }
  if (version > SCHEMA_VERSION) return { ok: false, error: `This export uses schema version ${version}, which this version of the app cannot read.` }

  const { data, errors } = parseFinanceData(json.data)
  const total = data.transactions.length + data.budgets.length + data.goals.length
  if (total === 0) return { ok: false, error: errors[0] ?? 'The file contains no records.' }

  const prints = new Set(existing.transactions.map(fingerprint))
  const txIds = new Set(existing.transactions.map((t) => t.id))
  const budgetKeys = new Set(existing.budgets.map((b) => b.categoryId))
  const goalIds = new Set(existing.goals.map((g) => g.id))
  const goalNames = new Set(existing.goals.map((g) => g.name.toLowerCase()))

  const fresh: FinanceData = {
    transactions: data.transactions.filter((t) => !txIds.has(t.id) && !prints.has(fingerprint(t))),
    budgets: data.budgets.filter((b) => !budgetKeys.has(b.categoryId)),
    goals: data.goals.filter((g) => !goalIds.has(g.id) && !goalNames.has(g.name.toLowerCase())),
  }
  const duplicates = total - (fresh.transactions.length + fresh.budgets.length + fresh.goals.length)
  return { ok: true, preview: { incoming: data, fresh, duplicates, errors, schemaVersion: version } }
}

export function downloadText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
