import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, ReceiptText, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button, IconButton } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { Badge, EmptyState } from '@/components/ui/Misc'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { TransactionForm } from '@/features/TransactionForm'
import { CATEGORIES, getCategory } from '@/data/categories'
import { useFinance } from '@/finance/store'
import { useFormat } from '@/app/prefs'
import { useT } from '@/i18n/useT'
import { summarize } from '@/finance/calc'
import type { Transaction } from '@/types/models'
import styles from './transactions.module.css'

const PAGE_SIZE = 20
type Sort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

const SORTERS: Record<Sort, (a: Transaction, b: Transaction) => number> = {
  'date-desc': (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  'date-asc': (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  'amount-desc': (a, b) => b.amount - a.amount,
  'amount-asc': (a, b) => a.amount - b.amount,
}

export default function Transactions() {
  const fin = useFinance()
  const fmt = useFormat()
  const t = useT()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [category, setCategory] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<Sort>('date-desc')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(params.get('new') ? 'new' : null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const deferred = useDeferredValue(query)

  // The header's "Add transaction" button navigates here with ?new=1.
  useEffect(() => {
    if (params.get('new')) {
      setEditing('new')
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    return fin.transactions
      .filter((x) => (type === 'all' || x.type === type) && (category === 'all' || x.categoryId === category))
      .filter((x) => (!from || x.date >= from) && (!to || x.date <= to))
      .filter((x) => !q || x.description.toLowerCase().includes(q) || getCategory(x.categoryId).name.toLowerCase().includes(q) || t(getCategory(x.categoryId).name).toLowerCase().includes(q))
      .sort(SORTERS[sort])
  }, [fin.transactions, deferred, type, category, from, to, sort, t])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const totals = useMemo(() => summarize(filtered), [filtered])
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }
  const filtersActive = query || type !== 'all' || category !== 'all' || from || to

  return (
    <>
      <PageHeader
        title={t('Transactions')}
        description={t('Record, search and review every movement of money.')}
        actions={
          <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing('new')}>
            {t('Add transaction')}
          </Button>
        }
      />

      <Card className={styles.filters} as="section" aria-label={t('Filters')}>
        <div className={styles.search}>
          <TextField label={t('Search')} type="search" placeholder={t('Description or category')} value={query} onChange={(e) => reset(setQuery)(e.target.value)} />
          <Search size={16} aria-hidden="true" className={styles.searchIcon} />
        </div>
        <SelectField label={t('Type')} value={type} onChange={(e) => reset(setType)(e.target.value as typeof type)}>
          <option value="all">{t('All types')}</option>
          <option value="income">{t('Income')}</option>
          <option value="expense">{t('Expenses')}</option>
        </SelectField>
        <SelectField label={t('Category')} value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
          <option value="all">{t('All categories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.name)}
            </option>
          ))}
        </SelectField>
        <TextField label={t('From')} type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
        <TextField label={t('To')} type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
        <SelectField label={t('Sort by')} value={sort} onChange={(e) => reset(setSort)(e.target.value as Sort)}>
          <option value="date-desc">{t('Newest first')}</option>
          <option value="date-asc">{t('Oldest first')}</option>
          <option value="amount-desc">{t('Largest amount')}</option>
          <option value="amount-asc">{t('Smallest amount')}</option>
        </SelectField>
      </Card>

      <Card className={styles.tableCard} as="section" aria-label={t('Transaction list')}>
        {fin.status === 'loading' ? (
          <p className={styles.status} role="status">{t('Loading transactions')}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={28} strokeWidth={1.5} />}
            title={filtersActive ? t('No matching transactions') : t('No transactions yet')} level={2}
            action={
              filtersActive ? (
                <Button
                  onClick={() => {
                    setQuery(''); setType('all'); setCategory('all'); setFrom(''); setTo(''); setPage(1)
                  }}
                >
                  {t('Clear filters')}
                </Button>
              ) : (
                <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing('new')}>
                  {t('Add your first transaction')}
                </Button>
              )
            }
          >
            {filtersActive ? t('Try a different search or widen the date range.') : t('Add income and expenses to see them here.')}
          </EmptyState>
        ) : (
          <>
            <p className={styles.summary} role="status">
              {t(filtered.length === 1 ? '{n} transaction' : '{n} transactions', { n: filtered.length })} · {t('income')} <span className="num">{fmt.money(totals.income)}</span> · {t('expenses')} <span className="num">{fmt.money(totals.expenses)}</span>
            </p>
            <table className={styles.table}>
              <caption className="sr-only">{t('Transactions, page {current} of {pages}', { current, pages })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('Description')}</th>
                  <th scope="col">{t('Category')}</th>
                  <th scope="col">{t('Date')}</th>
                  <th scope="col" className={styles.right}>{t('Amount')}</th>
                  <th scope="col"><span className="sr-only">{t('Actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id}>
                    <td data-label={t('Description')} className={styles.desc}>
                      <span className={styles.catIcon}><CategoryIcon categoryId={tx.categoryId} /></span>
                      <span className={styles.descText}>
                        {tx.description}
                        {tx.source === 'demo' && <Badge>{t('Demo')}</Badge>}
                      </span>
                    </td>
                    <td data-label={t('Category')}>{t(getCategory(tx.categoryId).name)}</td>
                    <td data-label={t('Date')} className="num">{fmt.date(tx.date)}</td>
                    <td data-label={t('Amount')} className={`${styles.right} ${styles.amount} num`} data-type={tx.type}>
                      {tx.type === 'income' ? '+' : '−'}{fmt.money(tx.amount)}
                      <span className="sr-only">{tx.type === 'income' ? ' ' + t('income') : ' ' + t('expense')}</span>
                    </td>
                    <td className={styles.actions}>
                      <IconButton label={t('Edit {name}', { name: tx.description })} onClick={() => setEditing(tx)}>
                        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                      </IconButton>
                      <IconButton label={t('Delete {name}', { name: tx.description })} onClick={() => setDeleting(tx)}>
                        <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <nav className={styles.pager} aria-label={t('Pagination')}>
                <IconButton label={t('Previous page')} variant="secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </IconButton>
                <span className="num">{t('Page {current} of {pages}', { current, pages })}</span>
                <IconButton label={t('Next page')} variant="secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  <ChevronRight size={18} aria-hidden="true" />
                </IconButton>
              </nav>
            )}
          </>
        )}
      </Card>

      {editing && (
        <TransactionForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={async (saved) => {
            await fin.saveTransaction(saved)
            toast.show(editing === 'new' ? t('Transaction added') : t('Transaction updated'))
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('Delete transaction?')}
          message={t('"{name}" for {amount} will be removed. This cannot be undone.', { name: deleting.description, amount: fmt.money(deleting.amount) })}
          confirmLabel={t('Delete')}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await fin.deleteTransaction(deleting.id)
              toast.show(t('Transaction deleted'))
            } catch (e) {
              toast.show(e instanceof Error ? e.message : t('Could not delete'), 'error')
            }
            setDeleting(null)
          }}
        />
      )}
    </>
  )
}
