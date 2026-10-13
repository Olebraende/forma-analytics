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
import { useT } from '@/i18n/useT'
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
  const t = useT()
  const today = useToday()
  const [range, setRange] = useState<Range>('12m')
  const [category, setCategory] = useState('all')
  const [metric, setMetric] = useState<Metric>('expenses')

  const data = useMemo(() => {
    const r = periodRange(range, today)
    const txs = category === 'all' ? fin.transactions : fin.transactions.filter((x) => x.categoryId === category)
    const fromKey = monthKey(r.from)
    const toKey = monthKey(r.to)
    const series = monthlySeries(txs, fromKey, toKey)
    const inRange = txs.filter((x) => x.date >= r.from && x.date <= r.to)
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
        top.forEach((c, y) => months.forEach((m, x) => points.push([x, y, inRange.filter((x) => x.type === 'expense' && x.categoryId === c.categoryId && monthKey(x.date) === m).reduce((sum, x) => sum + x.amount, 0)])))
        return { cats: top.map((c) => t(getCategory(c.categoryId).name)), months, points }
      })(),
    }
  }, [fin.transactions, fin.budgets, fin.goals, range, category, today, metric, t])

  if (fin.status === 'ready' && fin.transactions.length === 0)
    return (
      <>
        <PageHeader title={t('Analytics')} />
        <Card><EmptyState icon={<ChartNoAxesCombined size={28} strokeWidth={1.5} />} title={t('No data to analyse')} level={2}>{t('Add transactions or load demo data in Settings to see charts.')}</EmptyState></Card>
      </>
    )

  const labels = data.series.map((p) => fmt.month(p.month))
  const longLabels = data.series.map((p) => fmt.month(p.month, 'long'))
  const money = (v: number) => fmt.money(v)
  const catName = category === 'all' ? t('all categories') : t(getCategory(category).name)
  const monthNames = data.monthsOf(data.year).map((k) => fmt.month(k).split(' ')[0] as string)
  const metricLabel = { expenses: t('Expenses'), income: t('Income'), net: t('Net cash flow') }[metric]
  const busiest = [...data.series].sort((a, b) => b.expenses - a.expenses)[0]

  return (
    <>
      <PageHeader title={t('Analytics')} description={t('Explore trends, categories and comparisons. Every chart has a data table.')} />
      <Card as="section" aria-label={t('Filters')} className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel} id="range-label">{t('Date range')}</span>
          <Segmented name="range" label={t('Date range')} value={range} onChange={setRange} options={RANGES.map((r) => ({ ...r, label: t(r.label) }))} />
        </div>
        <SelectField label={t('Category')} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{t('All categories')}</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
        </SelectField>
      </Card>

      <div className={`${styles.grid} stagger`}>
        <div className={styles.wide} style={{ '--i': 0 } as React.CSSProperties}>
          <ChartCard title={t('Income versus expenses')} description={t('Monthly, {cat}', { cat: catName })}
            summary={busiest ? t('Expenses were highest in {month} at {amount}.', { month: fmt.month(busiest.month, 'long'), amount: money(busiest.expenses) }) : undefined}
            table={{ caption: t('Income, expenses and net by month'), columns: [t('Month'), t('Income'), t('Expenses'), t('Net')], rows: data.series.map((p, i) => [longLabels[i] as string, money(p.income), money(p.expenses), fmt.money(p.net, { signed: true })]) }}>
            <FinancialTrendChart label={t('Income versus expenses, {cat}', { cat: catName })} formatValue={money} formatTick={fmt.compact} points={data.series.map((p, i) => ({ label: labels[i] as string, income: p.income, expenses: p.expenses, net: p.net }))} />
          </ChartCard>
        </div>
        <div style={{ '--i': 1 } as React.CSSProperties}>
          <ChartCard title={t('Monthly spending trend')} description={t('Expenses, {cat}', { cat: catName })}
            table={{ caption: t('Expenses by month'), columns: [t('Month'), t('Expenses')], rows: data.series.map((p, i) => [longLabels[i] as string, money(p.expenses)]) }}>
            <AreaChart label={t('Monthly spending trend')} formatValue={money} formatTick={fmt.compact} categories={labels} series={[{ id: 'expenses', label: t('Expenses'), values: data.series.map((p) => p.expenses) }]} />
          </ChartCard>
        </div>
        <div style={{ '--i': 2 } as React.CSSProperties}>
          <ChartCard title={t('Cumulative net savings')} description={t('Running total of income minus expenses')}
            table={{ caption: t('Cumulative net cash flow'), columns: [t('Month'), t('Cumulative net')], rows: data.series.map((_, i) => [longLabels[i] as string, fmt.money(data.cumulative[i] ?? 0, { signed: true })]) }}>
            <LineChart label={t('Cumulative net savings')} formatValue={money} formatTick={fmt.compact} categories={labels} series={[{ id: 'cum', label: t('Cumulative net'), values: data.cumulative }]} />
          </ChartCard>
        </div>
        <div style={{ '--i': 3 } as React.CSSProperties}>
          <ChartCard title={t('Expense categories')} description={t('Share of spending in the selected range')}
            table={{ caption: t('Expenses by category'), columns: [t('Category'), t('Amount'), t('Share')], rows: data.expenseCats.map((c) => [t(getCategory(c.categoryId).name), money(c.total), `${Math.round((c.total / (data.total.expenses || 1)) * 100)}%`]) }}>
            {data.expenseCats.length ? (
              <DonutChart label={t('Expenses by category')} centerLabel={t('spent')} formatValue={money} data={data.expenseCats.map((c) => ({ id: c.categoryId, label: t(getCategory(c.categoryId).name), value: c.total }))} />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title={t('No expenses for this selection')} />}
          </ChartCard>
        </div>
        <div style={{ '--i': 4 } as React.CSSProperties}>
          <ChartCard title={t('Budget versus actual')} description={t('Current month')}
            table={{ caption: t('Budget versus actual this month'), columns: [t('Category'), t('Budget'), t('Spent')], rows: data.budgets.map((b) => [t(getCategory(b.budget.categoryId).name), money(b.budget.limit), money(b.spent)]) }}>
            {data.budgets.length ? (
              <BarChart label={t('Budget versus actual by category')} seriesLabels={[t('Budget'), t('Spent')]} formatValue={money} data={data.budgets.map((b) => ({ id: b.budget.id, label: t(getCategory(b.budget.categoryId).name), values: [b.budget.limit, b.spent] }))} />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title={t('No budgets set')} />}
          </ChartCard>
        </div>
        <div style={{ '--i': 5 } as React.CSSProperties}>
          <ChartCard title={t('Savings progress')} description={t('Saved versus target')}
            table={{ caption: t('Savings goals'), columns: [t('Goal'), t('Target'), t('Saved')], rows: data.goals.map((g) => [g.goal.name, money(g.goal.target), money(g.goal.saved)]) }}>
            {data.goals.length ? (
              <BarChart warnOver={false} label={t('Savings goal progress')} seriesLabels={[t('Target'), t('Saved')]} formatValue={money} data={data.goals.map((g) => ({ id: g.goal.id, label: g.goal.name, values: [g.goal.target, g.goal.saved] }))} />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title={t('No savings goals')} />}
          </ChartCard>
        </div>
        <div className={styles.wide} style={{ '--i': 6 } as React.CSSProperties}>
          <ChartCard title={t('Spending heatmap')} description={t('Largest expense categories by month, {cat}', { cat: catName })}
            table={{ caption: t('Expenses by category and month'), columns: [t('Category'), ...data.heat.months.map((m) => fmt.month(m))], rows: data.heat.cats.map((cat, y) => [cat, ...data.heat.months.map((_, x) => fmt.money(data.heat.points.find((p) => p[0] === x && p[1] === y)?.[2] ?? 0))]) }}>
            {data.heat.cats.length ? (
              <HeatmapChart label={t('Spending by category and month')} formatValue={money} formatTick={fmt.compact} xCategories={data.heat.months.map((m) => fmt.month(m))} yCategories={data.heat.cats} points={data.heat.points} summary={t('Darker cells mean more spending. Every value is also in the data table.')} />
            ) : <EmptyState icon={<ChartNoAxesCombined size={24} />} title={t('No expenses for this selection')} />}
          </ChartCard>
        </div>
        <div className={styles.wide} style={{ '--i': 7 } as React.CSSProperties}>
          <ChartCard title={t('Year over year')} description={t('{metric} by month, {year} compared with {prev}', { metric: metricLabel, year: data.year, prev: data.year - 1 })}
            action={<Segmented name="metric" label={t('Metric')} value={metric} onChange={setMetric} options={[{ id: 'expenses', label: t('Expenses') }, { id: 'income', label: t('Income') }, { id: 'net', label: t('Net') }]} />}
            table={{ caption: t('{metric} by month, two years', { metric: metricLabel }), columns: [t('Month'), String(data.year), String(data.year - 1)], rows: monthNames.map((m, i) => [m, fmt.money(data.thisYear[i] ?? 0), fmt.money(data.lastYear[i] ?? 0)]) }}>
            <ColumnChart label={t('{metric}, {year} versus {prev}', { metric: metricLabel, year: data.year, prev: data.year - 1 })} formatValue={money} formatTick={fmt.compact} categories={monthNames}
              series={[{ id: 'this', label: String(data.year), values: data.thisYear }, { id: 'last', label: String(data.year - 1), values: data.lastYear }]} />
          </ChartCard>
        </div>
      </div>
    </>
  )
}

