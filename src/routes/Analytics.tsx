import { useMemo, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState, Segmented } from '@/components/ui/Misc'
import { SelectField } from '@/components/ui/Field'
import { AreaChart, BarChart, ColumnChart, DonutChart, FinancialTrendChart, HeatmapChart, LineChart } from '@/charts'
import { ChartCard } from '@/charts/ChartCard'
import { CATEGORIES, getCategory } from '@/data/categories'
import { budgetStatuses, categoryTotals, goalProgress, monthlySeries, periodRange, summarize } from '@/finance/calc'
import { useFinance } from '@/finance/store'
import { useFormat } from '@/app/prefs'
import { useToday } from '@/hooks/useToday'
import { monthKey, monthsBetween } from '@/utils/dates'
import type { Period } from '@/types/models'
import styles from './analytics.module.css'

type Range = Extract<Period, '3m' | '6m' | '12m' | 'ytd'>
const RANGES: { id: Range; label: string }[] = [
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '12m', label: '12 months' },
  { id: 'ytd', label: 'Year to date' },
]
type Metric = 'expenses' | 'income' | 'net'

export default function Analytics() {
  const fin = useFinance()
  const fmt = useFormat()
  const today = useToday()
  const [range, setRange] = useState<Range>('12m')
  const [category, setCategory] = useState('all')
  const [metric, setMetric] = useState<Metric>('expenses')

  const data = useMemo(() => {
    const r = periodRange(range, today)
    const txs = category === 'all' ? fin.transactions : fin.transactions.filter((t) => t.categoryId === category)
    const fromKey = monthKey(r.from)
    const toKey = monthKey(r.to)
    const series = monthlySeries(txs, fromKey, toKey)
    const inRange = txs.filter((t) => t.date >= r.from && t.date <= r.to)
    let run = 0
    const cumulative = series.map((p) => (run += p.net))
    const year = Number(today.slice(0, 4))
    const monthsOf = (y: number) => monthsBetween(`${y}-01`, `${y}-12`)
    const yearSeries = (y: number) => monthlySeries(txs, `${y}-01`, `${y}-12`).map((p) => p[metric])
    return {
      series, cumulative, inRange,
      expenseCats: categoryTotals(inRange),
      budgets: budgetStatuses(fin.budgets, fin.transactions, monthKey(today)),
      goals: fin.goals.map((g) => goalProgress(g, today)),
      year, monthsOf, thisYear: yearSeries(year), lastYear: yearSeries(year - 1),
      total: summarize(inRange),
      heat: (() => {
        const top = categoryTotals(inRange).slice(0, 8)
        const months = series.map((p) => p.month)
        const points: [number, number, number][] = []
        top.forEach((c, y) => months.forEach((m, x) => points.push([x, y, inRange.filter((t) => t.type === 'expense' && t.categoryId === c.categoryId && monthKey(t.date) === m).reduce((sum, t) => sum + t.amount, 0)])))
        return { cats: top.map((c) => getCategory(c.categoryId).name), months, points }
      })(),
    }
  }, [fin.transactions, fin.budgets, fin.goals, range, category, today, metric])

  if (fin.status === 'ready' && fin.transactions.length === 0)
    return (
      <>
        <PageHeader title="Analytics" />
        <Card><EmptyState icon={<ChartNoAxesCombined size={28} strokeWidth={1.5} />} title="No data to analyse">Add transactions or load demo data in Settings to see charts.</EmptyState></Card>
      </>
    )

  const labels = data.series.map((p) => fmt.month(p.month))
  const longLabels = data.series.map((p) => fmt.month(p.month, 'long'))
  const money = (v: number) => fmt.money(v)
  const catName = category === 'all' ? 'all categories' : getCategory(category).name
  const monthNames = data.monthsOf(data.year).map((k) => fmt.month(k).split(' ')[0] as string)
  const metricLabel = { expenses: 'Expenses', income: 'Income', net: 'Net cash flow' }[metric]
  const busiest = [...data.series].sort((a, b) => b.expenses - a.expenses)[0]

  return (
    <>
      <PageHeader title="Analytics" description="Explore trends, categories and comparisons. Every chart has a data table." />
      <Card as="section" aria-label="Filters" className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel} id="range-label">Date range</span>
          <Segmented name="range" label="Date range" value={range} onChange={setRange} options={RANGES} />
        </div>
        <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
      </Card>

      <div className={`${styles.grid} stagger`}>
        <div className={styles.wide} style={{ '--i': 0 } as React.CSSProperties}>
          <ChartCard title="Income versus expenses" description={`Monthly, ${catName}`}
            summary={busiest ? `Expenses were highest in ${fmt.month(busiest.month, 'long')} at ${money(busiest.expenses)}.` : undefined}
            table={{ caption: 'Income, expenses and net by month', columns: ['Month', 'Income', 'Expenses', 'Net'], rows: data.series.map((p, i) => [longLabels[i] as string, money(p.income), money(p.expenses), fmt.money(p.net, { signed: true })]) }}>
            <FinancialTrendChart label={`Income versus expenses, ${catName}`} formatValue={money} formatTick={fmt.compact} points={data.series.map((p, i) => ({ label: labels[i] as string, income: p.income, expenses: p.expenses, net: p.net }))} />
          </ChartCard>
        </div>
        <div style={{ '--i': 1 } as React.CSSProperties}>
          <ChartCard title="Monthly spending trend" description={`Expenses, ${catName}`}
            table={{ caption: 'Expenses by month', columns: ['Month', 'Expenses'], rows: data.series.map((p, i) => [longLabels[i] as string, money(p.expenses)]) }}>
            <AreaChart label="Monthly spending trend" formatValue={money} formatTick={fmt.compact} categories={labels} series={[{ id: 'expenses', label: 'Expenses', values: data.series.map((p) => p.expenses) }]} />
          </ChartCard>
        </div>
        <div style={{ '--i': 2 } as React.CSSProperties}>
          <ChartCard title="Cumulative net savings" description="Running total of income minus expenses"
            table={{ caption: 'Cumulative net cash flow', columns: ['Month', 'Cumulative net'], rows: data.series.map((_, i) => [longLabels[i] as string, fmt.money(data.cumulative[i] ?? 0, { signed: true })]) }}>
            <LineChart label="Cumulative net savings" formatValue={money} formatTick={fmt.compact} categories={labels} series={[{ id: 'cum', label: 'Cumulative net', values: data.cumulative }]} />
          </ChartCard>
        </div>
        <div style={{ '--i': 3 } as React.CSSProperties}>
          <ChartCard title="Expense categories" description="Share of spending in the selected range"
            table={{ caption: 'Expenses by category', columns: ['Category', 'Amount', 'Share'], rows: data.expenseCats.map((c) => [getCategory(c.categoryId).name, money(c.total), `${Math.round((c.total / (data.total.expenses || 1)) * 100)}%`]) }}>
            {data.expenseCats.length ? (
              <DonutChart label="Expenses by category" centerLabel="spent" formatValue={money} data={data.expenseCats.map((c) => ({ id: c.categoryId, label: getCategory(c.categoryId).name, value: c.total }))} />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title="No expenses for this selection" />}
          </ChartCard>
        </div>
        <div style={{ '--i': 4 } as React.CSSProperties}>
          <ChartCard title="Budget versus actual" description="Current month"
            table={{ caption: 'Budget versus actual this month', columns: ['Category', 'Budget', 'Spent'], rows: data.budgets.map((b) => [getCategory(b.budget.categoryId).name, money(b.budget.limit), money(b.spent)]) }}>
            {data.budgets.length ? (
              <BarChart label="Budget versus actual by category" seriesLabels={['Budget', 'Spent']} formatValue={money} data={data.budgets.map((b) => ({ id: b.budget.id, label: getCategory(b.budget.categoryId).name, values: [b.budget.limit, b.spent] }))} />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title="No budgets set" />}
          </ChartCard>
        </div>
        <div style={{ '--i': 5 } as React.CSSProperties}>
          <ChartCard title="Savings progress" description="Saved versus target"
            table={{ caption: 'Savings goals', columns: ['Goal', 'Target', 'Saved'], rows: data.goals.map((g) => [g.goal.name, money(g.goal.target), money(g.goal.saved)]) }}>
            {data.goals.length ? (
              <BarChart warnOver={false} label="Savings goal progress" seriesLabels={['Target', 'Saved']} formatValue={money} data={data.goals.map((g) => ({ id: g.goal.id, label: g.goal.name, values: [g.goal.target, g.goal.saved] }))} />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title="No savings goals" />}
          </ChartCard>
        </div>
        <div className={styles.wide} style={{ '--i': 6 } as React.CSSProperties}>
          <ChartCard title="Spending heatmap" description={`Largest expense categories by month, ${catName}`}
            table={{ caption: 'Expenses by category and month', columns: ['Category', ...data.heat.months.map((m) => fmt.month(m))], rows: data.heat.cats.map((cat, y) => [cat, ...data.heat.months.map((_, x) => fmt.money(data.heat.points.find((p) => p[0] === x && p[1] === y)?.[2] ?? 0))]) }}>
            {data.heat.cats.length ? (
              <HeatmapChart label="Spending by category and month" formatValue={money} formatTick={fmt.compact} xCategories={data.heat.months.map((m) => fmt.month(m))} yCategories={data.heat.cats} points={data.heat.points} summary="Darker cells mean more spending. Every value is also in the data table." />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title="No expenses for this selection" />}
          </ChartCard>
        </div>
        <div className={styles.wide} style={{ '--i': 7 } as React.CSSProperties}>
          <ChartCard title="Year over year" description={`${metricLabel} by month, ${data.year} compared with ${data.year - 1}`}
            action={<Segmented name="metric" label="Metric" value={metric} onChange={setMetric} options={[{ id: 'expenses', label: 'Expenses' }, { id: 'income', label: 'Income' }, { id: 'net', label: 'Net' }]} />}
            table={{ caption: `${metricLabel} by month, two years`, columns: ['Month', String(data.year), String(data.year - 1)], rows: monthNames.map((m, i) => [m, fmt.money(data.thisYear[i] ?? 0), fmt.money(data.lastYear[i] ?? 0)]) }}>
            <ColumnChart label={`${metricLabel}, ${data.year} versus ${data.year - 1}`} formatValue={money} formatTick={fmt.compact} categories={monthNames}
              series={[{ id: 'this', label: String(data.year), values: data.thisYear }, { id: 'last', label: String(data.year - 1), values: data.lastYear }]} />
          </ChartCard>
        </div>
      </div>
    </>
  )
}

