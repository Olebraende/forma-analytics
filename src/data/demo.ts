import type { Budget, FinanceData, SavingsGoal, Transaction } from '@/types/models'
import { addMonths, monthEnd, monthKey, pad } from '@/utils/dates'

/** Small deterministic PRNG so demo data is stable for a given day. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const kr = (n: number) => Math.round(n * 100)

export function generateDemoData(today: string): FinanceData {
  const rand = mulberry32(20260101)
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo)
  const transactions: Transaction[] = []
  let n = 0
  const add = (month: string, day: number, type: Transaction['type'], categoryId: string, amountKr: number, description: string) => {
    const last = Number(monthEnd(month).slice(8, 10))
    const date = `${month}-${pad(Math.min(day, last))}`
    if (date > today) return
    transactions.push({
      id: `demo-tx-${++n}`,
      type,
      amount: kr(amountKr),
      categoryId,
      date,
      description,
      source: 'demo',
      createdAt: `${date}T09:00:00.000Z`,
    })
  }

  const current = monthKey(today)
  for (let i = 13; i >= 0; i--) {
    const m = addMonths(current, -i)
    const monthNo = Number(m.slice(5, 7))
    add(m, 25, 'income', 'salary', 47_800 + (i < 6 ? 1_500 : 0), 'Monthly salary, Fjordline Studio')
    if (rand() > 0.45) add(m, 12, 'income', 'freelance', Math.round(between(3_000, 11_000) / 50) * 50, 'Freelance design project')
    if (monthNo % 3 === 0) add(m, 28, 'income', 'investments', Math.round(between(600, 1_800)), 'Index fund dividend')

    add(m, 1, 'expense', 'housing', 14_200, 'Rent, Storgata 12')
    add(m, 5, 'expense', 'utilities', Math.round(between(1_100, 2_300)), 'Electricity and internet')
    add(m, 8, 'expense', 'subscriptions', 149, 'Music streaming')
    add(m, 8, 'expense', 'subscriptions', 119, 'Video streaming')
    add(m, 3, 'expense', 'subscriptions', 449, 'Gym membership')
    for (const [day, shop] of [[2, 'Corner Grocer'], [6, 'City Market'], [10, 'Corner Grocer'], [14, 'Farmers Market'], [18, 'City Market'], [22, 'Corner Grocer'], [27, 'City Market']] as const)
      add(m, day, 'expense', 'groceries', Math.round(between(260, 880)), shop)
    add(m, 4, 'expense', 'transport', 790, 'Monthly transit pass')
    if (rand() > 0.6) add(m, 16, 'expense', 'transport', Math.round(between(180, 520)), 'Taxi')
    for (const day of [9, 15, 21, 26]) if (rand() > 0.35) add(m, day, 'expense', 'dining', Math.round(between(190, 780)), rand() > 0.5 ? 'Harbour Bistro' : 'Noodle Bar')
    if (rand() > 0.55) add(m, 13, 'expense', 'health', Math.round(between(250, 900)), 'Pharmacy and clinic')
    for (const day of [11, 19, 24]) if (rand() > 0.4) add(m, day, 'expense', 'leisure', Math.round(between(150, 640)), rand() > 0.5 ? 'Cinema' : 'Concert tickets')
    if (rand() > 0.35) add(m, 17, 'expense', 'shopping', Math.round(between(400, 2_400)), 'Clothing and home goods')
    if (monthNo === 7) add(m, 14, 'expense', 'travel', 9_800, 'Summer holiday flights')
    if (monthNo === 12) add(m, 10, 'expense', 'shopping', 3_600, 'Gifts')
    if (rand() > 0.85) add(m, 20, 'expense', 'other-expense', Math.round(between(200, 1_100)), 'Miscellaneous')
  }

  const budgetDefs: [string, number][] = [
    ['housing', 14_500],
    ['groceries', 5_200],
    ['transport', 1_500],
    ['dining', 2_000],
    ['utilities', 2_000],
    ['leisure', 1_200],
    ['shopping', 2_200],
    ['subscriptions', 800],
  ]
  const budgets: Budget[] = budgetDefs.map(([categoryId, limit]) => ({
    id: `demo-budget-${categoryId}`,
    categoryId,
    limit: kr(limit),
    source: 'demo',
  }))

  const goals: SavingsGoal[] = [
    { id: 'demo-goal-emergency', name: 'Emergency fund', target: kr(60_000), saved: kr(41_500), targetDate: `${addMonths(current, 8)}-01`, source: 'demo' },
    { id: 'demo-goal-trip', name: 'Lofoten trip', target: kr(18_000), saved: kr(15_200), targetDate: `${addMonths(current, 4)}-15`, source: 'demo' },
    { id: 'demo-goal-laptop', name: 'New laptop', target: kr(22_000), saved: kr(22_000), source: 'demo' },
    { id: 'demo-goal-bike', name: 'Electric bike', target: kr(30_000), saved: kr(6_800), targetDate: `${addMonths(current, 14)}-01`, source: 'demo' },
  ]

  return { transactions, budgets, goals }
}

