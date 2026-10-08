import { budgetStatuses, budgetTotals, categoryTotals, changeRatio, generateInsights, goalProgress, monthlySeries, overallSavings, periodRange, previousRange, summarize } from './calc'
import type { Budget, SavingsGoal, Transaction } from '@/types/models'

let n = 0
const tx = (date: string, type: 'income' | 'expense', amount: number, categoryId = type === 'income' ? 'salary' : 'groceries'): Transaction => ({
  id: `t${++n}`, type, amount, categoryId, date, description: 'x', source: 'user', createdAt: `${date}T00:00:00Z`,
})

describe('summarize', () => {
  it('totals income, expenses, net and savings rate in integers', () => {
    const s = summarize([tx('2026-03-01', 'income', 500000), tx('2026-03-02', 'expense', 125050), tx('2026-03-03', 'expense', 74950)])
    expect(s).toEqual({ income: 500000, expenses: 200000, net: 300000, savingsRate: 0.6 })
  })
  it('handles empty and income-free data', () => {
    expect(summarize([])).toEqual({ income: 0, expenses: 0, net: 0, savingsRate: 0 })
    expect(summarize([tx('2026-03-01', 'expense', 100)]).savingsRate).toBe(0)
  })
  it('sums many small amounts exactly', () => {
    const txs = Array.from({ length: 1000 }, () => tx('2026-01-01', 'expense', 10))
    expect(summarize(txs).expenses).toBe(10000)
  })
})

describe('periods', () => {
  const today = '2026-10-08'
  it('computes ranges', () => {
    expect(periodRange('this-month', today)).toEqual({ from: '2026-10-01', to: today })
    expect(periodRange('last-month', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(periodRange('3m', today)).toEqual({ from: '2026-08-01', to: today })
    expect(periodRange('12m', today).from).toBe('2025-11-01')
    expect(periodRange('ytd', today).from).toBe('2026-01-01')
  })
  it('handles year boundaries', () => {
    expect(periodRange('last-month', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })
  it('compares partial periods to the same span earlier', () => {
    expect(previousRange(periodRange('this-month', today))).toEqual({ from: '2026-09-01', to: '2026-09-08' })
    expect(previousRange(periodRange('3m', today))).toEqual({ from: '2026-05-01', to: '2026-07-08' })
  })
  it('compares whole-month periods to the preceding months', () => {
    expect(previousRange({ from: '2026-07-01', to: '2026-09-30' })).toEqual({ from: '2026-04-01', to: '2026-06-30' })
  })
})

describe('monthlySeries and categories', () => {
  const txs = [tx('2026-01-10', 'income', 1000), tx('2026-03-05', 'expense', 400), tx('2026-03-06', 'expense', 100, 'dining')]
  it('fills empty months', () => {
    const s = monthlySeries(txs, '2026-01', '2026-03')
    expect(s.map((p) => p.month)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(s[1]).toMatchObject({ income: 0, expenses: 0 })
    expect(s[2]?.expenses).toBe(500)
  })
  it('ranks expense categories', () => {
    expect(categoryTotals(txs).map((c) => [c.categoryId, c.total])).toEqual([['groceries', 400], ['dining', 100]])
  })
  it('computes change ratios', () => {
    expect(changeRatio(150, 100)).toBe(0.5)
    expect(changeRatio(50, 100)).toBe(-0.5)
    expect(changeRatio(10, 0)).toBeNull()
  })
})

describe('budgets', () => {
  const budgets: Budget[] = [
    { id: 'b1', categoryId: 'groceries', limit: 1000, source: 'user' },
    { id: 'b2', categoryId: 'dining', limit: 500, source: 'user' },
    { id: 'b3', categoryId: 'transport', limit: 300, source: 'user' },
  ]
  const txs = [
    tx('2026-05-02', 'expense', 1200, 'groceries'),
    tx('2026-05-03', 'expense', 450, 'dining'),
    tx('2026-04-30', 'expense', 999, 'transport'),
    tx('2026-05-04', 'income', 5000, 'salary'),
  ]
  const st = budgetStatuses(budgets, txs, '2026-05')
  it('flags over, warning and ok states', () => {
    expect(st.map((s) => s.state)).toEqual(['over', 'warning', 'ok'])
    expect(st[0]).toMatchObject({ spent: 1200, remaining: -200 })
    expect(st[1]?.utilization).toBeCloseTo(0.9)
  })
  it('only counts expenses in the chosen month', () => {
    expect(st[2]?.spent).toBe(0)
  })
  it('totals', () => {
    expect(budgetTotals(st)).toMatchObject({ limit: 1800, spent: 1650, remaining: 150 })
  })
  it('treats exactly-at-limit as not over', () => {
    expect(budgetStatuses([budgets[0] as Budget], [tx('2026-05-02', 'expense', 1000, 'groceries')], '2026-05')[0]?.state).toBe('warning')
  })
})

describe('goals', () => {
  const goal = (over: Partial<SavingsGoal> = {}): SavingsGoal => ({ id: 'g', name: 'Trip', target: 100000, saved: 25000, source: 'user', ...over })
  it('computes progress and remaining', () => {
    expect(goalProgress(goal(), '2026-01-01')).toMatchObject({ progress: 0.25, remaining: 75000, complete: false })
  })
  it('marks completion and clamps progress', () => {
    expect(goalProgress(goal({ saved: 120000 }), '2026-01-01')).toMatchObject({ progress: 1, remaining: 0, complete: true })
  })
  it('computes required monthly saving', () => {
    const p = goalProgress(goal({ targetDate: '2026-07-01' }), '2026-01-01')
    expect(p.monthsLeft).toBe(6)
    expect(p.requiredMonthly).toBe(12500)
  })
  it('flags overdue goals', () => {
    expect(goalProgress(goal({ targetDate: '2025-12-01' }), '2026-01-01')).toMatchObject({ overdue: true, requiredMonthly: null })
  })
  it('aggregates overall savings without counting overfunding', () => {
    expect(overallSavings([goal({ saved: 150000 }), goal({ id: 'h', target: 100000, saved: 50000 })])).toEqual({ target: 200000, saved: 150000, progress: 0.75 })
  })
})

describe('insights', () => {
  it('reports overspent budgets and spending change', () => {
    const current = [tx('2026-05-01', 'income', 10000), tx('2026-05-02', 'expense', 6000)]
    const previous = [tx('2026-04-02', 'expense', 3000)]
    const budgets = budgetStatuses([{ id: 'b', categoryId: 'groceries', limit: 1000, source: 'user' }], current, '2026-05')
    const out = generateInsights({ current, previous, budgets, goals: [], categoryName: (id) => id, money: (m) => String(m) })
    const ids = out.map((i) => i.id)
    expect(ids).toContain('budget-over')
    expect(out.find((i) => i.id === 'expense-change')?.title).toBe('Spending is up 100%')
  })
})
