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
      .filter((t) => (type === 'all' || t.type === type) && (category === 'all' || t.categoryId === category))
      .filter((t) => (!from || t.date >= from) && (!to || t.date <= to))
      .filter((t) => !q || t.description.toLowerCase().includes(q) || getCategory(t.categoryId).name.toLowerCase().includes(q))
      .sort(SORTERS[sort])
  }, [fin.transactions, deferred, type, category, from, to, sort])

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
        title="Transactions"
        description="Record, search and review every movement of money."
        actions={
          <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing('new')}>
            Add transaction
          </Button>
        }
      />

      <Card className={styles.filters} as="section" aria-label="Filters">
        <div className={styles.search}>
          <TextField label="Search" type="search" placeholder="Description or category" value={query} onChange={(e) => reset(setQuery)(e.target.value)} />
          <Search size={16} aria-hidden="true" className={styles.searchIcon} />
        </div>
        <SelectField label="Type" value={type} onChange={(e) => reset(setType)(e.target.value as typeof type)}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </SelectField>
        <SelectField label="Category" value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="From" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
        <TextField label="To" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
        <SelectField label="Sort by" value={sort} onChange={(e) => reset(setSort)(e.target.value as Sort)}>
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Largest amount</option>
          <option value="amount-asc">Smallest amount</option>
        </SelectField>
      </Card>

      <Card className={styles.tableCard} as="section" aria-label="Transaction list">
        {fin.status === 'loading' ? (
          <p className={styles.status} role="status">Loading transactions</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={28} strokeWidth={1.5} />}
            title={filtersActive ? 'No matching transactions' : 'No transactions yet'}
            action={
              filtersActive ? (
                <Button
                  onClick={() => {
                    setQuery(''); setType('all'); setCategory('all'); setFrom(''); setTo(''); setPage(1)
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing('new')}>
                  Add your first transaction
                </Button>
              )
            }
          >
            {filtersActive ? 'Try a different search or widen the date range.' : 'Add income and expenses to see them here.'}
          </EmptyState>
        ) : (
          <>
            <p className={styles.summary} role="status">
              {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'} · income <span className="num">{fmt.money(totals.income)}</span> · expenses <span className="num">{fmt.money(totals.expenses)}</span>
            </p>
            <table className={styles.table}>
              <caption className="sr-only">Transactions, page {current} of {pages}</caption>
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">Category</th>
                  <th scope="col">Date</th>
                  <th scope="col" className={styles.right}>Amount</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Description" className={styles.desc}>
                      <span className={styles.catIcon}><CategoryIcon categoryId={t.categoryId} /></span>
                      <span className={styles.descText}>
                        {t.description}
                        {t.source === 'demo' && <Badge>Demo</Badge>}
                      </span>
                    </td>
                    <td data-label="Category">{getCategory(t.categoryId).name}</td>
                    <td data-label="Date" className="num">{fmt.date(t.date)}</td>
                    <td data-label="Amount" className={`${styles.right} ${styles.amount} num`} data-type={t.type}>
                      {t.type === 'income' ? '+' : '−'}{fmt.money(t.amount)}
                      <span className="sr-only">{t.type === 'income' ? ' income' : ' expense'}</span>
                    </td>
                    <td className={styles.actions}>
                      <IconButton label={`Edit ${t.description}`} onClick={() => setEditing(t)}>
                        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Delete ${t.description}`} onClick={() => setDeleting(t)}>
                        <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <nav className={styles.pager} aria-label="Pagination">
                <IconButton label="Previous page" variant="secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </IconButton>
                <span className="num">Page {current} of {pages}</span>
                <IconButton label="Next page" variant="secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>
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
          onSave={async (t) => {
            await fin.saveTransaction(t)
            toast.show(editing === 'new' ? 'Transaction added' : 'Transaction updated')
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete transaction?"
          message={`"${deleting.description}" for ${fmt.money(deleting.amount)} will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await fin.deleteTransaction(deleting.id)
              toast.show('Transaction deleted')
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not delete', 'error')
            }
            setDeleting(null)
          }}
        />
      )}
    </>
  )
}
