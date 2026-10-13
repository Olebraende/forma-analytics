import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, Lightbulb, PiggyBank, Plus, Target, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { KpiCard } from '@/components/KpiCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, Segmented, Skeleton } from '@/components/ui/Misc'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { ChartCard } from '@/charts/ChartCard'
import { DonutChart, FinancialTrendChart } from '@/charts'
import { useFinance } from '@/finance/store'
import { useFormat } from '@/app/prefs'
import { useT } from '@/i18n/useT'
import { useToday } from '@/hooks/useToday'
import {
  budgetStatuses, budgetTotals, categoryTotals, changeRatio, filterByRange, generateInsights, goalProgress, monthlySeries,
  overallSavings, PERIODS, periodRange, previousRange, sortByDateDesc, summarize,
} from '@/finance/calc'
import { getCategory } from '@/data/categories'
import { addMonths, monthKey } from '@/utils/dates'
import type { Period } from '@/types/models'
import styles from './routes.module.css'

export default function Overview() {
  const fin = useFinance()
  const fmt = useFormat()
  const t = useT()
  const today = useToday()
  const [period, setPeriod] = useState<Period>('3m')

  const view = useMemo(() => {
    const range = periodRange(period, today)
    const prevRange = previousRange(range)
    const current = filterByRange(fin.transactions, range)
    const previous = filterByRange(fin.transactions, prevRange)
    const sum = summarize(current)
    const prev = summarize(previous)
    const budgetMonth = monthKey(range.to)
    const budgets = budgetStatuses(fin.budgets, fin.transactions, budgetMonth)
    const goals = fin.goals.map((g) => goalProgress(g, today))
    // Show at least six months of trend, ending with the selected period.
    const endKey = monthKey(range.to)
    const startKey = range.from.slice(0, 7) < addMonths(endKey, -5) ? range.from.slice(0, 7) : addMonths(endKey, -5)
    const series = monthlySeries(fin.transactions, startKey, endKey)
    return {
      range, current, sum, prev, budgetMonth, budgets, budgetTotal: budgetTotals(budgets), goals,
      savings: overallSavings(fin.goals), series,
      categories: categoryTotals(current),
      recent: [...current].sort(sortByDateDesc).slice(0, 7),
      insights: generateInsights({
        current, previous, budgets, goals, categoryName: (id) => t(getCategory(id).name), money: (m) => fmt.money(m), t,
      }),
    }
  }, [fin.transactions, fin.budgets, fin.goals, period, today, fmt, t])

  if (fin.status === 'loading') return <OverviewSkeleton />

  if (fin.transactions.length === 0)
    return (
      <>
        <PageHeader title={t('Overview')} />
        <Card>
          <EmptyState
            icon={<Wallet size={28} strokeWidth={1.5} />}
            title={t('Nothing to show yet')} level={2}
            action={
              <div className={styles.row}>
                <Link to="/transactions?new=1">
                  <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />}>{t('Add a transaction')}</Button>
                </Link>
                <Button onClick={() => void fin.loadDemo()}>{t('Load demo data')}</Button>
              </div>
            }
          >
            {t('Add your first transaction or explore with fictional demo data. Everything stays in this browser.')}
          </EmptyState>
        </Card>
      </>
    )

  const { sum, prev } = view
  const trend = view.series.map((p) => ({ label: fmt.month(p.month), income: p.income, expenses: p.expenses, net: p.net }))
  const peak = [...view.series].sort((a, b) => b.expenses - a.expenses)[0]
  // The current month is incomplete, so it would falsely look like a collapse in the trend line.
  const completeMonths = view.series.filter((p) => p.month < monthKey(today))
  const trendOf = (pick: (p: (typeof view.series)[number]) => number) => (completeMonths.length > 1 ? completeMonths : view.series).map(pick)
  const periodLabel = t(PERIODS.find((p) => p.id === period)?.label ?? '')

  return (
    <>
      <PageHeader
        title={t('Overview')}
        description={t('A snapshot of your income, spending and progress.')}
        actions={<Segmented name="period" label={t('Reporting period')} value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ id: p.id, label: t(p.label) }))} />}
      />

      <section aria-labelledby="kpi-heading" className={`${styles.kpis} stagger`}>
        <h2 id="kpi-heading" className="sr-only">
          {t('Key figures, {period}', { period: periodLabel })}
        </h2>
        <div style={{ '--i': 0 } as React.CSSProperties}>
          <KpiCard label={t('Total income')} trend={trendOf((p) => p.income)} icon={<ArrowDownToLine size={16} strokeWidth={1.75} />} value={sum.income} change={changeRatio(sum.income, prev.income)} />
        </div>
        <div style={{ '--i': 1 } as React.CSSProperties}>
          <KpiCard label={t('Total expenses')} trend={trendOf((p) => p.expenses)} icon={<ArrowUpFromLine size={16} strokeWidth={1.75} />} value={sum.expenses} change={changeRatio(sum.expenses, prev.expenses)} upIsGood={false} />
        </div>
        <div style={{ '--i': 2 } as React.CSSProperties}>
          <KpiCard label={t('Net cash flow')} trend={trendOf((p) => p.net)} icon={<TrendingUp size={16} strokeWidth={1.75} />} value={sum.net} signed change={changeRatio(sum.net, prev.net)} footnote={sum.income > 0 ? t('{pct}% of income kept', { pct: Math.round(sum.savingsRate * 100) }) : undefined} />
        </div>
        <div style={{ '--i': 3 } as React.CSSProperties}>
          <KpiCard label={t('Budget remaining')} icon={<PiggyBank size={16} strokeWidth={1.75} />} value={view.budgetTotal.remaining} signed={view.budgetTotal.remaining < 0} footnote={fin.budgets.length ? fmt.month(view.budgetMonth, 'long') : t('No budgets set')} />
        </div>
        <div style={{ '--i': 4 } as React.CSSProperties}>
          <KpiCard label={t('Savings progress')} icon={<Target size={16} strokeWidth={1.75} />} value={view.savings.saved} footnote={view.savings.target ? t('{pct}% of {target}', { pct: Math.round(view.savings.progress * 100), target: fmt.compact(view.savings.target) }) : t('No goals yet')} />
        </div>
      </section>

      <div className={`${styles.grid} stagger`}>
        <div className={styles.wide} style={{ '--i': 5 } as React.CSSProperties}>
          <ChartCard
            title={t('Income and expenses')}
            description={t('Monthly totals with net cash flow')}
            summary={peak ? t('Spending peaked in {month} at {amount}.', { month: fmt.month(peak.month, 'long'), amount: fmt.money(peak.expenses) }) : undefined}
            table={{
              caption: t('Monthly income, expenses and net cash flow'),
              columns: [t('Month'), t('Income'), t('Expenses'), t('Net')],
              rows: view.series.map((p) => [fmt.month(p.month, 'long'), fmt.money(p.income), fmt.money(p.expenses), fmt.money(p.net, { signed: true })]),
            }}
          >
            <FinancialTrendChart points={trend} formatValue={(v) => fmt.money(v)} formatTick={fmt.compact} label={t('Monthly income, expenses and net cash flow')} summary={peak ? t('Spending peaked in {month}.', { month: fmt.month(peak.month, 'long') }) : undefined} />
          </ChartCard>
        </div>
        <div style={{ '--i': 6 } as React.CSSProperties}>
          <ChartCard
            title={t('Where money goes')}
            description={periodLabel}
            table={{ caption: t('Expenses by category'), columns: [t('Category'), t('Amount'), t('Share')], rows: view.categories.map((c) => [t(getCategory(c.categoryId).name), fmt.money(c.total), `${Math.round((c.total / (sum.expenses || 1)) * 100)}%`]) }}
          >
            {view.categories.length ? (
              <DonutChart label={t('Expenses by category')} centerLabel={t('spent')} formatValue={(v) => fmt.money(v)} data={view.categories.map((c) => ({ id: c.categoryId, label: t(getCategory(c.categoryId).name), value: c.total }))} />
            ) : (
              <EmptyState icon={<Wallet size={24} />} title={t('No expenses in this period')} />
            )}
          </ChartCard>
        </div>
        <div style={{ '--i': 7 } as React.CSSProperties}>
          <Card as="section" aria-labelledby="insights-title">
            <CardHeader id="insights-title" title={t('Insights')} description={t('Generated from your data')} />
            {view.insights.length ? (
              <ul className={styles.insights}>
                {view.insights.map((i) => (
                  <li key={i.id} className={styles.insight} data-tone={i.tone}>
                    <Lightbulb size={18} strokeWidth={1.75} aria-hidden="true" />
                    <div>
                      <p className={styles.insightTitle}>{i.title}</p>
                      <p className={styles.insightBody}>{i.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>{t('Insights appear once there is income and spending in the selected period.')}</p>
            )}
          </Card>
        </div>
        <div className={styles.wide} style={{ '--i': 8 } as React.CSSProperties}>
          <Card as="section" aria-labelledby="recent-title">
            <CardHeader id="recent-title" title={t('Recent transactions')} action={<Link to="/transactions">{t('View all')}</Link>} />
            {view.recent.length ? (
              <ul className={styles.recent}>
                {view.recent.map((tx) => (
                  <li key={tx.id} className={styles.recentItem}>
                    <span className={styles.catIcon}>
                      <CategoryIcon categoryId={tx.categoryId} />
                    </span>
                    <div className={styles.recentText}>
                      <p className={styles.recentTitle}>{tx.description}</p>
                      <p className={styles.muted}>
                        {t(getCategory(tx.categoryId).name)} · {fmt.date(tx.date)}
                      </p>
                    </div>
                    <span className={`num ${styles.amount}`} data-type={tx.type}>
                      {tx.type === 'income' ? '+' : '−'}
                      {fmt.money(tx.amount)}
                      <span className="sr-only">{tx.type === 'income' ? ' ' + t('income') : ' ' + t('expense')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>{t('No transactions in this period.')}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

function OverviewSkeleton() {
  const t = useT()
  return (
    <div role="status" aria-label={t('Loading overview')}>
      <Skeleton height="2.25rem" width="12rem" />
      <div className={styles.kpis} style={{ marginTop: 'var(--space-6)' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <Skeleton height="0.9rem" width="50%" />
            <div style={{ height: 14 }} />
            <Skeleton height="2rem" width="70%" />
          </Card>
        ))}
      </div>
    </div>
  )
}
