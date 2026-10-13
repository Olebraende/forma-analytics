import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/Field'
import { getCategory } from '@/data/categories'
import {
  budgetStatuses, budgetTotals, categoryTotals, filterByRange, goalProgress, monthlySeries, PERIODS, periodRange, sortByDateDesc, summarize,
} from '@/finance/calc'
import { useFinance } from '@/finance/store'
import { useFormat } from '@/app/prefs'
import { useT } from '@/i18n/useT'
import { useToday } from '@/hooks/useToday'
import { monthKey } from '@/utils/dates'
import type { Period } from '@/types/models'
import styles from './report.module.css'

/**
 * A clean, printable summary. The browser's print dialog turns it into a PDF ("Save as PDF"),
 * so nothing is uploaded and no PDF library is needed.
 */
export default function Report() {
  const fin = useFinance()
  const fmt = useFormat()
  const t = useT()
  const today = useToday()
  const [period, setPeriod] = useState<Period>('12m')
  const [withList, setWithList] = useState(true)

  const data = useMemo(() => {
    const range = periodRange(period, today)
    const txs = filterByRange(fin.transactions, range)
    const month = monthKey(range.to)
    const budgets = budgetStatuses(fin.budgets, fin.transactions, month)
    return {
      range, txs, month, budgets,
      sum: summarize(txs),
      months: monthlySeries(fin.transactions, monthKey(range.from), month),
      income: categoryTotals(txs, 'income'),
      expenses: categoryTotals(txs, 'expense'),
      budgetTotal: budgetTotals(budgets),
      goals: fin.goals.map((g) => goalProgress(g, today)),
      list: [...txs].sort(sortByDateDesc),
      demo: txs.some((x) => x.source === 'demo') || fin.budgets.some((b) => b.source === 'demo') || fin.goals.some((g) => g.source === 'demo'),
    }
  }, [fin.transactions, fin.budgets, fin.goals, period, today])

  const { sum } = data
  const monthsCount = Math.max(1, data.months.length)
  const share = (v: number, total: number) => t('{pct}%', { pct: Math.round((v / (total || 1)) * 100) })

  return (
    <>
      <div data-print="hide">
        <PageHeader
          title={t('Report')}
          description={t('A clean summary you can print or save as a PDF. Nothing is uploaded.')}
          actions={<Button variant="primary" icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>{t('Print or save as PDF')}</Button>}
        />
        <div className={styles.options}>
          <SelectField label={t('Period')} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{t(p.label)}</option>)}
          </SelectField>
          <label className={styles.check}>
            <input type="checkbox" checked={withList} onChange={(e) => setWithList(e.target.checked)} />
            <span>{t('Include the list of transactions')}</span>
          </label>
        </div>
      </div>

      <article className={styles.paper} aria-label={t('Financial summary')}>
        <header className={styles.docHead}>
          <p className={styles.brand}>Forma Analytics</p>
          <h2 className={styles.docTitle}>{t('Financial summary')}</h2>
          <p className={styles.meta}>
            {t('Period')}: {fmt.date(data.range.from)} – {fmt.date(data.range.to)} · {t('Created')}: {fmt.date(today)}
          </p>
        </header>

        <p className={styles.notice}>
          {t('Compiled by the person who entered the data in Forma Analytics. It is not issued or verified by a bank, employer or authority, and is not an official document.')}
        </p>
        {data.demo && <p className={styles.notice} data-tone="warn">{t('This report includes fictional demo data.')}</p>}

        <h3 className={styles.h}>{t('Summary')}</h3>
        <table className={styles.table}>
          <tbody>
            <tr><th scope="row">{t('Total income')}</th><td>{fmt.money(sum.income)}</td></tr>
            <tr><th scope="row">{t('Total expenses')}</th><td>{fmt.money(sum.expenses)}</td></tr>
            <tr><th scope="row">{t('Net cash flow')}</th><td>{fmt.money(sum.net, { signed: true })}</td></tr>
            {sum.income > 0 && <tr><th scope="row">{t('Share of income kept')}</th><td>{Math.round(sum.savingsRate * 100)} %</td></tr>}
            <tr><th scope="row">{t('Average income per month')}</th><td>{fmt.money(Math.round(sum.income / monthsCount))}</td></tr>
            <tr><th scope="row">{t('Average expenses per month')}</th><td>{fmt.money(Math.round(sum.expenses / monthsCount))}</td></tr>
          </tbody>
        </table>

        <h3 className={styles.h}>{t('By month')}</h3>
        <table className={styles.table}>
          <thead>
            <tr><th scope="col">{t('Month')}</th><th scope="col">{t('Income')}</th><th scope="col">{t('Expenses')}</th><th scope="col">{t('Net')}</th></tr>
          </thead>
          <tbody>
            {data.months.map((p) => (
              <tr key={p.month}><th scope="row">{fmt.month(p.month, 'long')}</th><td>{fmt.money(p.income)}</td><td>{fmt.money(p.expenses)}</td><td>{fmt.money(p.net, { signed: true })}</td></tr>
            ))}
          </tbody>
        </table>

        {data.income.length > 0 && (
          <>
            <h3 className={styles.h}>{t('Income by category')}</h3>
            <table className={styles.table}>
              <thead><tr><th scope="col">{t('Category')}</th><th scope="col">{t('Amount')}</th><th scope="col">{t('Share')}</th></tr></thead>
              <tbody>
                {data.income.map((c) => <tr key={c.categoryId}><th scope="row">{t(getCategory(c.categoryId).name)}</th><td>{fmt.money(c.total)}</td><td>{share(c.total, sum.income)}</td></tr>)}
              </tbody>
            </table>
          </>
        )}

        {data.expenses.length > 0 && (
          <>
            <h3 className={styles.h}>{t('Expenses by category')}</h3>
            <table className={styles.table}>
              <thead><tr><th scope="col">{t('Category')}</th><th scope="col">{t('Amount')}</th><th scope="col">{t('Share')}</th></tr></thead>
              <tbody>
                {data.expenses.map((c) => <tr key={c.categoryId}><th scope="row">{t(getCategory(c.categoryId).name)}</th><td>{fmt.money(c.total)}</td><td>{share(c.total, sum.expenses)}</td></tr>)}
              </tbody>
            </table>
          </>
        )}

        {data.budgets.length > 0 && (
          <>
            <h3 className={styles.h}>{t('Budgets, {month}', { month: fmt.month(data.month, 'long') })}</h3>
            <table className={styles.table}>
              <thead><tr><th scope="col">{t('Category')}</th><th scope="col">{t('Budget')}</th><th scope="col">{t('Spent')}</th><th scope="col">{t('Remaining')}</th></tr></thead>
              <tbody>
                {data.budgets.map((b) => <tr key={b.budget.id}><th scope="row">{t(getCategory(b.budget.categoryId).name)}</th><td>{fmt.money(b.budget.limit)}</td><td>{fmt.money(b.spent)}</td><td>{fmt.money(b.remaining, { signed: true })}</td></tr>)}
                <tr className={styles.total}><th scope="row">{t('Total')}</th><td>{fmt.money(data.budgetTotal.limit)}</td><td>{fmt.money(data.budgetTotal.spent)}</td><td>{fmt.money(data.budgetTotal.remaining, { signed: true })}</td></tr>
              </tbody>
            </table>
          </>
        )}

        {data.goals.length > 0 && (
          <>
            <h3 className={styles.h}>{t('Savings goals')}</h3>
            <table className={styles.table}>
              <thead><tr><th scope="col">{t('Goal')}</th><th scope="col">{t('Saved')}</th><th scope="col">{t('Target')}</th><th scope="col">{t('Progress')}</th></tr></thead>
              <tbody>
                {data.goals.map((g) => <tr key={g.goal.id}><th scope="row">{g.goal.name}</th><td>{fmt.money(g.goal.saved)}</td><td>{fmt.money(g.goal.target)}</td><td>{Math.round(g.progress * 100)} %</td></tr>)}
              </tbody>
            </table>
          </>
        )}

        {withList && data.list.length > 0 && (
          <>
            <h3 className={styles.h}>{t('Transactions')} ({data.list.length})</h3>
            <table className={`${styles.table} ${styles.list}`}>
              <thead><tr><th scope="col">{t('Date')}</th><th scope="col">{t('Description')}</th><th scope="col">{t('Category')}</th><th scope="col">{t('Amount')}</th></tr></thead>
              <tbody>
                {data.list.map((x) => (
                  <tr key={x.id}>
                    <td>{fmt.date(x.date)}</td>
                    <td>{x.description}</td>
                    <td>{t(getCategory(x.categoryId).name)}</td>
                    <td>{x.type === 'income' ? '+' : '−'}{fmt.money(x.amount)}<span className="sr-only"> {x.type === 'income' ? t('income') : t('expense')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {data.txs.length === 0 && <p className={styles.empty}>{t('No transactions in this period.')}</p>}
      </article>
    </>
  )
}
