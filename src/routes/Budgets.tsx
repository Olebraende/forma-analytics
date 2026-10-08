import { useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Pencil, PiggyBank, Plus, Trash2, TriangleAlert, CircleCheck, CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button, IconButton } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { Badge, EmptyState, ProgressBar } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { BarChart } from '@/charts'
import { ChartCard } from '@/charts/ChartCard'
import { categoriesFor, getCategory } from '@/data/categories'
import { budgetStatuses, budgetTotals, type BudgetStatus } from '@/finance/calc'
import { newId, useFinance } from '@/finance/store'
import { useFormat } from '@/app/prefs'
import { useToday } from '@/hooks/useToday'
import { addMonths, monthKey } from '@/utils/dates'
import { minorToInput, parseAmount } from '@/utils/money'
import type { Budget } from '@/types/models'
import styles from './budgets.module.css'

export default function Budgets() {
  const fin = useFinance()
  const fmt = useFormat()
  const toast = useToast()
  const today = useToday()
  const thisMonth = monthKey(today)
  const [month, setMonth] = useState(thisMonth)
  const [editing, setEditing] = useState<Budget | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Budget | null>(null)

  const statuses = useMemo(() => budgetStatuses(fin.budgets, fin.transactions, month).sort((a, b) => b.utilization - a.utilization), [fin.budgets, fin.transactions, month])
  const totals = budgetTotals(statuses)

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Monthly spending limits by category."
        actions={
          <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing('new')}>
            Add budget
          </Button>
        }
      />

      <div className={styles.monthNav} role="group" aria-label="Budget month">
        <IconButton label="Previous month" variant="secondary" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={18} aria-hidden="true" />
        </IconButton>
        <h2 className={styles.monthLabel} aria-live="polite">{fmt.month(month, 'long')}</h2>
        <IconButton label="Next month" variant="secondary" disabled={month >= thisMonth} onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={18} aria-hidden="true" />
        </IconButton>
      </div>

      {statuses.length === 0 ? (
        <Card>
          <EmptyState icon={<PiggyBank size={28} strokeWidth={1.5} />} title="No budgets yet" level={2} action={<Button variant="primary" onClick={() => setEditing('new')}>Create a budget</Button>}>
            Set a monthly limit for a category to track how much is left.
          </EmptyState>
        </Card>
      ) : (
        <div className={styles.layout}>
          <Card as="section" aria-labelledby="bt" className={styles.total}>
            <CardHeader id="bt" title="Total across budgets" />
            <p className={`${styles.big} num`} data-negative={totals.remaining < 0 || undefined}>
              {fmt.money(Math.abs(totals.remaining))} {totals.remaining < 0 ? 'over' : 'left'}
            </p>
            <p className={styles.muted}>
              <span className="num">{fmt.money(totals.spent)}</span> spent of <span className="num">{fmt.money(totals.limit)}</span>
            </p>
            <ProgressBar value={totals.utilization} label="Total budget used" tone={totals.utilization > 1 ? 'negative' : totals.utilization >= 0.85 ? 'warning' : 'accent'} />
            <p className={styles.muted}>{Math.round(totals.utilization * 100)}% used</p>
          </Card>
          <ChartCard
            title="Budget versus actual"
            description={fmt.month(month, 'long')}
            table={{
              caption: 'Budget versus actual spending by category',
              columns: ['Category', 'Budget', 'Spent', 'Remaining'],
              rows: statuses.map((s) => [getCategory(s.budget.categoryId).name, fmt.money(s.budget.limit), fmt.money(s.spent), fmt.money(s.remaining, { signed: true })]),
            }}
          >
            <BarChart label="Budget versus actual by category" seriesLabels={['Budget', 'Spent']} formatValue={(v) => fmt.money(v)} data={statuses.map((s) => ({ id: s.budget.id, label: getCategory(s.budget.categoryId).name, values: [s.budget.limit, s.spent] }))} />
          </ChartCard>
          <ul className={`${styles.cards} stagger`}>
            {statuses.map((s, i) => (
              <li key={s.budget.id} style={{ '--i': i } as React.CSSProperties}>
                <BudgetCard status={s} onEdit={() => setEditing(s.budget)} onDelete={() => setDeleting(s.budget)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <BudgetForm
          initial={editing === 'new' ? undefined : editing}
          taken={fin.budgets.map((b) => b.categoryId)}
          onClose={() => setEditing(null)}
          onSave={async (b) => {
            await fin.saveBudget(b)
            toast.show(editing === 'new' ? 'Budget created' : 'Budget updated')
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete budget?"
          message={`The ${getCategory(deleting.categoryId).name} budget will be removed. Your transactions are not affected.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await fin.deleteBudget(deleting.id)
            toast.show('Budget deleted')
            setDeleting(null)
          }}
        />
      )}
    </>
  )

  function BudgetCard({ status, onEdit, onDelete }: { status: BudgetStatus; onEdit: () => void; onDelete: () => void }) {
    const cat = getCategory(status.budget.categoryId)
    const badge =
      status.state === 'over' ? (
        <Badge tone="negative" icon={<TriangleAlert size={12} aria-hidden="true" />}>Over by {fmt.money(-status.remaining)}</Badge>
      ) : status.state === 'warning' ? (
        <Badge tone="warning" icon={<CircleAlert size={12} aria-hidden="true" />}>Near limit</Badge>
      ) : (
        <Badge tone="positive" icon={<CircleCheck size={12} aria-hidden="true" />}>On track</Badge>
      )
    return (
      <Card as="article" interactive aria-label={`${cat.name} budget`}>
        <div className={styles.cardTop}>
          <span className={styles.icon}><CategoryIcon categoryId={cat.id} /></span>
          <h3 className={styles.cardTitle}>{cat.name}</h3>
          <div className={styles.cardActions}>
            <IconButton label={`Edit ${cat.name} budget`} onClick={onEdit}><Pencil size={16} aria-hidden="true" /></IconButton>
            <IconButton label={`Delete ${cat.name} budget`} onClick={onDelete}><Trash2 size={16} aria-hidden="true" /></IconButton>
          </div>
        </div>
        <p className={`${styles.cardBig} num`}>
          {fmt.money(status.spent)} <span className={styles.muted}>of {fmt.money(status.budget.limit)}</span>
        </p>
        <ProgressBar value={status.utilization} label={`${cat.name} budget used`} tone={status.state === 'over' ? 'negative' : status.state === 'warning' ? 'warning' : 'accent'} />
        <div className={styles.cardBottom}>
          {badge}
          <span className={`${styles.muted} num`}>
            {status.remaining >= 0 ? `${fmt.money(status.remaining)} left` : `${Math.round(status.utilization * 100)}% used`}
          </span>
        </div>
      </Card>
    )
  }
}

function BudgetForm({ initial, taken, onSave, onClose }: { initial?: Budget; taken: string[]; onSave: (b: Budget) => Promise<void>; onClose: () => void }) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [limit, setLimit] = useState(initial ? minorToInput(initial.limit) : '')
  const [errors, setErrors] = useState<{ category?: string; limit?: string }>({})
  const [saving, setSaving] = useState(false)
  const available = categoriesFor('expense').filter((c) => c.id === initial?.categoryId || !taken.includes(c.id))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const minor = parseAmount(limit)
    const errs: typeof errors = {}
    if (!categoryId) errs.category = 'Choose a category.'
    if (minor === null) errs.limit = 'Enter a monthly limit above zero.'
    setErrors(errs)
    if (Object.keys(errs).length || minor === null) return
    setSaving(true)
    try {
      await onSave({ id: initial?.id ?? newId('budget'), categoryId, limit: minor, source: initial?.source ?? 'user' })
      onClose()
    } catch {
      setSaving(false)
      setErrors({ limit: 'Could not save. Check your browser storage and try again.' })
    }
  }
  return (
    <Modal
      size="sm"
      title={initial ? 'Edit budget' : 'Add budget'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="budget-form" loading={saving}>Save budget</Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={submit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.category} disabled={!!initial} hint={available.length === 0 ? 'Every expense category already has a budget.' : undefined}>
          <option value="">Select a category</option>
          {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <TextField label="Monthly limit" inputMode="decimal" placeholder="0.00" value={limit} onChange={(e) => setLimit(e.target.value)} error={errors.limit} />
      </form>
    </Modal>
  )
}
