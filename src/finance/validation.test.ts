import { cleanText, parseFinanceData, parseTransaction } from './validation'

const valid = { id: 'a1', type: 'expense', amount: 1500, categoryId: 'groceries', date: '2026-02-03', description: 'Milk', source: 'user', createdAt: '2026-02-03T10:00:00Z' }

describe('parseTransaction', () => {
  it('accepts a valid transaction', () => expect(parseTransaction(valid).ok).toBe(true))
  it.each([
    ['float amount', { amount: 12.5 }],
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -5 }],
    ['string amount', { amount: '100' }],
    ['unknown category', { categoryId: 'nope' }],
    ['category/type mismatch', { type: 'income' }],
    ['impossible date', { date: '2026-02-30' }],
    ['bad date format', { date: '03/02/2026' }],
    ['blank description', { description: '   ' }],
    ['bad id', { id: '<script>' }],
    ['bad type', { type: 'transfer' }],
  ])('rejects %s', (_n, patch) => expect(parseTransaction({ ...valid, ...patch }).ok).toBe(false))

  it('keeps hostile text inert and bounded', () => {
    const r = parseTransaction({ ...valid, description: '<img src=x onerror=alert(1)>' + 'a'.repeat(500) })
    expect(r.ok && r.value.description.length).toBeLessThanOrEqual(200)
    expect(r.ok && r.value.description.startsWith('<img')).toBe(true) // stored verbatim; React escapes on render
  })
  it('rejects non-objects', () => {
    for (const v of [null, 5, 'x', [], undefined]) expect(parseTransaction(v).ok).toBe(false)
  })
})

describe('parseFinanceData', () => {
  it('drops invalid and duplicate rows and reports them', () => {
    const { data, errors } = parseFinanceData({ transactions: [valid, valid, { ...valid, id: 'b', amount: -1 }], budgets: 'oops' })
    expect(data.transactions).toHaveLength(1)
    expect(errors.length).toBe(3)
  })
  it('rejects oversized lists', () => {
    const { data, errors } = parseFinanceData({ transactions: [valid, { ...valid, id: 'z' }] }, 1)
    expect(data.transactions).toHaveLength(0)
    expect(errors[0]).toMatch(/too many/)
  })
  it('validates goals', () => {
    const { data } = parseFinanceData({ goals: [{ id: 'g1', name: 'Bike', target: 1000, saved: 0 }, { id: 'g2', name: '', target: 1000, saved: 0 }, { id: 'g3', name: 'X', target: 1000, saved: -1 }] })
    expect(data.goals.map((g) => g.id)).toEqual(['g1'])
  })
})

describe('cleanText', () => {
  it('strips control characters and collapses whitespace', () => expect(cleanText('a\u0000b\n\n  c')).toBe('a b c'))
})
