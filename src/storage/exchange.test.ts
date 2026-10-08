import { buildExport, csvCell, previewImport, transactionsToCsv } from './exchange'
import type { FinanceData, Transaction } from '@/types/models'

const t = (over: Partial<Transaction> = {}): Transaction => ({ id: 't1', type: 'expense', amount: 12345, categoryId: 'groceries', date: '2026-02-03', description: 'Milk', source: 'user', createdAt: '2026-02-03T10:00:00Z', ...over })
const empty: FinanceData = { transactions: [], budgets: [], goals: [] }

describe('csv', () => {
  it('quotes special characters', () => expect(csvCell('a,"b"')).toBe('"a,""b"""'))
  it('neutralises formula injection', () => {
    for (const v of ['=SUM(A1)', '+1', '-1', '@cmd']) expect(csvCell(v).startsWith("'")).toBe(true)
  })
  it('exports decimals from minor units', () => {
    const csv = transactionsToCsv([t()])
    expect(csv.split('\r\n')[1]).toBe('2026-02-03,expense,Groceries,Milk,123.45,user')
  })
})

describe('import', () => {
  const file = (data: FinanceData, extra: object = {}) => JSON.stringify({ ...buildExport(data), ...extra })
  it('round-trips an export', () => {
    const r = previewImport(file({ ...empty, transactions: [t()] }), empty)
    expect(r.ok && r.preview.fresh.transactions).toHaveLength(1)
  })
  it('skips duplicates by id and by content', () => {
    const existing = { ...empty, transactions: [t()] }
    const r = previewImport(file({ ...empty, transactions: [t(), t({ id: 'other' }), t({ id: 'new', amount: 1 })] }), existing)
    expect(r.ok && r.preview.fresh.transactions.map((x) => x.id)).toEqual(['new'])
    expect(r.ok && r.preview.duplicates).toBe(2)
  })
  it('rejects bad files', () => {
    expect(previewImport('not json', empty)).toMatchObject({ ok: false })
    expect(previewImport('{"app":"other"}', empty)).toMatchObject({ ok: false })
    expect(previewImport(file(empty, { schemaVersion: 99 }), empty)).toMatchObject({ ok: false, error: expect.stringContaining('99') })
    expect(previewImport(file(empty), empty)).toMatchObject({ ok: false })
  })
  it('does not trust the prototype chain', () => {
    const r = previewImport('{"app":"forma-analytics","schemaVersion":1,"data":{"__proto__":{"transactions":[]},"transactions":[]}}', empty)
    expect(r.ok).toBe(false)
  })
})
