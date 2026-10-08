import type { Budget, DateRange, Minor, Period, SavingsGoal, Transaction } from '@/types/models'
import { addMonths, daysBetween, monthEnd, monthKey, monthStart, monthsBetween, toISO } from '@/utils/dates'

/* ---------- Periods ---------- */

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '12m', label: '12 months' },
  { id: 'ytd', label: 'Year to date' },
]

export function periodRange(period: Period, today: string): DateRange {
  const cur = monthKey(today)
  switch (period) {
    case 'this-month':
      return { from: monthStart(cur), to: today }
    case 'last-month': {
      const k = addMonths(cur, -1)
      return { from: monthStart(k), to: monthEnd(k) }
    }
    case '3m':
      return { from: monthStart(addMonths(cur, -2)), to: today }
    case '6m':
      return { from: monthStart(addMonths(cur, -5)), to: today }
    case '12m':
      return { from: monthStart(addMonths(cur, -11)), to: today }
    case 'ytd':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
  }
}

/** The range of equal length that immediately precedes `range` (whole-month aligned). */
export function previousRange(range: DateRange): DateRange {
  const fromKey = monthKey(range.from)
  const toKey = monthKey(range.to)
  const count = monthsBetween(fromKey, toKey).length
  const isWholeMonths = range.to === monthEnd(toKey)
  if (!isWholeMonths && count === 1) {
    // Partial current month: compare against the same span of the previous month.
    const prev = addMonths(fromKey, -1)
    const day = Number(range.to.slice(8, 10))
    const lastDay = Number(monthEnd(prev).slice(8, 10))
    return { from: monthStart(prev), to: `${prev}-${String(Math.min(day, lastDay)).padStart(2, '0')}` }
  }
  const prevTo = addMonths(fromKey, -1)
  const prevFrom = addMonths(fromKey, -count)
  return { from: monthStart(prevFrom), to: monthEnd(prevTo) }
}

export const inRange = (iso: string, r: DateRange) => iso >= r.from && iso <= r.to

export const filterByRange = (txs: Transaction[], r: DateRange) => txs.filter((t) => inRange(t.date, r))

/* ---------- Summaries ---------- */

export interface Summary {
  income: Minor
  expenses: Minor
  net: Minor
  /** net / income, 0 when there is no income. May be negative. */
  savingsRate: number
}

export function summarize(txs: Transaction[]): Summary {
  let income = 0
  let expenses = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else expenses += t.amount
  }
  const net = income - expenses
  return { income, expenses, net, savingsRate: income > 0 ? net / income : 0 }
}

export interface MonthlyPoint extends Summary {
  month: string
}

export function monthlySeries(txs: Transaction[], fromKey: string, toKey: string): MonthlyPoint[] {
  const buckets = new Map<string, Transaction[]>()
  for (const t of txs) {
    const k = monthKey(t.date)
    if (k < fromKey || k > toKey) continue
    const list = buckets.get(k)
    if (list) list.push(t)
    else buckets.set(k, [t])
  }
  return monthsBetween(fromKey, toKey).map((month) => ({ month, ...summarize(buckets.get(month) ?? []) }))
}

export interface CategoryTotal {
  categoryId: string
  total: Minor
  count: number
}

export function categoryTotals(txs: Transaction[], type: 'income' | 'expense' = 'expense'): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const t of txs) {
    if (t.type !== type) continue
    const row = map.get(t.categoryId) ?? { categoryId: t.categoryId, total: 0, count: 0 }
    row.total += t.amount
    row.count += 1
    map.set(t.categoryId, row)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Percentage change from previous to current; null when previous is zero. */
export const changeRatio = (current: number, previous: number): number | null =>
  previous === 0 ? null : (current - previous) / Math.abs(previous)

/* ---------- Budgets ---------- */

export interface BudgetStatus {
  budget: Budget
  spent: Minor
  remaining: Minor
  /** spent / limit (can exceed 1) */
  utilization: number
  state: 'ok' | 'warning' | 'over'
}

export const BUDGET_WARNING_THRESHOLD = 0.85

export function budgetStatuses(budgets: Budget[], txs: Transaction[], month: string): BudgetStatus[] {
  const spentBy = new Map<string, Minor>()
  for (const t of txs) {
    if (t.type !== 'expense' || monthKey(t.date) !== month) continue
    spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount)
  }
  return budgets.map((budget) => {
    const spent = spentBy.get(budget.categoryId) ?? 0
    const utilization = budget.limit > 0 ? spent / budget.limit : 0
    const state = spent > budget.limit ? 'over' : utilization >= BUDGET_WARNING_THRESHOLD ? 'warning' : 'ok'
    return { budget, spent, remaining: budget.limit - spent, utilization, state }
  })
}

export function budgetTotals(statuses: BudgetStatus[]) {
  const limit = statuses.reduce((s, b) => s + b.budget.limit, 0)
  const spent = statuses.reduce((s, b) => s + b.spent, 0)
  return { limit, spent, remaining: limit - spent, utilization: limit > 0 ? spent / limit : 0 }
}

/* ---------- Savings goals ---------- */

export interface GoalProgress {
  goal: SavingsGoal
  /** 0..1 (clamped) */
  progress: number
  remaining: Minor
  complete: boolean
  /** Whole months left until target date, null when no date or already past/complete. */
  monthsLeft: number | null
  /** Minor units to set aside each month to hit the date, null if not applicable. */
  requiredMonthly: Minor | null
  overdue: boolean
}

export function goalProgress(goal: SavingsGoal, today: string): GoalProgress {
  const remaining = Math.max(0, goal.target - goal.saved)
  const complete = goal.target > 0 && goal.saved >= goal.target
  const progress = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0
  let monthsLeft: number | null = null
  let requiredMonthly: Minor | null = null
  let overdue = false
  if (goal.targetDate && !complete) {
    if (goal.targetDate < today) {
      overdue = true
    } else {
      const days = daysBetween(today, goal.targetDate)
      monthsLeft = Math.max(1, Math.ceil(days / 30.4375))
      requiredMonthly = Math.ceil(remaining / monthsLeft)
    }
  }
  return { goal, progress, remaining, complete, monthsLeft, requiredMonthly, overdue }
}

export function overallSavings(goals: SavingsGoal[]) {
  const target = goals.reduce((s, g) => s + g.target, 0)
  const saved = goals.reduce((s, g) => s + Math.min(g.saved, g.target), 0)
  return { target, saved, progress: target > 0 ? saved / target : 0 }
}

/* ---------- Insights ---------- */

export interface Insight {
  id: string
  tone: 'positive' | 'warning' | 'neutral'
  title: string
  body: string
}

export interface InsightContext {
  current: Transaction[]
  previous: Transaction[]
  budgets: BudgetStatus[]
  goals: GoalProgress[]
  categoryName: (id: string) => string
  money: (minor: Minor) => string
}

export function generateInsights(ctx: InsightContext): Insight[] {
  const out: Insight[] = []
  const cur = summarize(ctx.current)
  const prev = summarize(ctx.previous)

  if (cur.income > 0) {
    const pct = Math.round(cur.savingsRate * 100)
    if (cur.net >= 0) {
      out.push({
        id: 'savings-rate',
        tone: pct >= 20 ? 'positive' : 'neutral',
        title: `You kept ${pct}% of your income`,
        body: `Net cash flow is ${ctx.money(cur.net)} for this period.`,
      })
    } else {
      out.push({
        id: 'negative-flow',
        tone: 'warning',
        title: 'Spending exceeded income',
        body: `Expenses were ${ctx.money(-cur.net)} higher than income in this period.`,
      })
    }
  }

  const change = changeRatio(cur.expenses, prev.expenses)
  if (change !== null && Math.abs(change) >= 0.05) {
    const pct = Math.round(Math.abs(change) * 100)
    out.push({
      id: 'expense-change',
      tone: change > 0 ? 'warning' : 'positive',
      title: change > 0 ? `Spending is up ${pct}%` : `Spending is down ${pct}%`,
      body: `Compared with the previous period (${ctx.money(prev.expenses)}).`,
    })
  }

  const top = categoryTotals(ctx.current)[0]
  if (top && cur.expenses > 0) {
    out.push({
      id: 'top-category',
      tone: 'neutral',
      title: `${ctx.categoryName(top.categoryId)} is your largest expense`,
      body: `${ctx.money(top.total)}, ${Math.round((top.total / cur.expenses) * 100)}% of all spending.`,
    })
  }

  const over = ctx.budgets.filter((b) => b.state === 'over')
  if (over.length > 0) {
    out.push({
      id: 'budget-over',
      tone: 'warning',
      title: over.length === 1 ? '1 budget is overspent' : `${over.length} budgets are overspent`,
      body: over.map((b) => ctx.categoryName(b.budget.categoryId)).join(', ') + '.',
    })
  } else if (ctx.budgets.length > 0 && ctx.budgets.every((b) => b.state === 'ok')) {
    out.push({
      id: 'budget-ok',
      tone: 'positive',
      title: 'All budgets are on track',
      body: 'No category has reached its warning threshold this month.',
    })
  }

  const nearly = ctx.goals.find((g) => !g.complete && g.progress >= 0.8)
  if (nearly) {
    out.push({
      id: 'goal-near',
      tone: 'positive',
      title: `${nearly.goal.name} is almost there`,
      body: `${ctx.money(nearly.remaining)} left to reach the target.`,
    })
  }
  return out.slice(0, 5)
}

/* ---------- Misc ---------- */

export const todayISO = () => toISO(new Date())

export const sortByDateDesc = (a: Transaction, b: Transaction) =>
  a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)

