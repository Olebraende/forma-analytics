import { useMemo, useState, type FormEvent } from 'react'
import { CalendarClock, CircleCheck, CirclePlus, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button, IconButton } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Badge, EmptyState, ProgressBar } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { BarChart } from '@/charts'
import { ChartCard } from '@/charts/ChartCard'
import { goalProgress, overallSavings, type GoalProgress } from '@/finance/calc'
import { cleanText } from '@/finance/validation'
import { newId, useFinance } from '@/finance/store'
import { useFormat } from '@/app/prefs'
import { useToday } from '@/hooks/useToday'
import { isValidISODate } from '@/utils/dates'
import { minorToInput, parseAmount } from '@/utils/money'
import type { SavingsGoal } from '@/types/models'
import styles from './goals.module.css'

export default function Goals() {
  const fin = useFinance()
  const fmt = useFormat()
  const toast = useToast()
  const today = useToday()
  const [editing, setEditing] = useState<SavingsGoal | 'new' | null>(null)
  const [funding, setFunding] = useState<SavingsGoal | null>(null)
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null)

  const progress = useMemo(() => fin.goals.map((g) => goalProgress(g, today)).sort((a, b) => Number(a.complete) - Number(b.complete) || b.progress - a.progress), [fin.goals, today])
  const overall = overallSavings(fin.goals)

  return (
    <>
      <PageHeader
        title="Savings goals"
        description="Track what you are saving for and how close you are."
        actions={<Button variant="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing('new')}>Add goal</Button>}
      />
      {progress.length === 0 ? (
        <Card>
          <EmptyState icon={<Target size={28} strokeWidth={1.5} />} title="No savings goals yet" level={2} action={<Button variant="primary" onClick={() => setEditing('new')}>Create a goal</Button>}>
            Name something you are saving for, set a target, and watch the progress grow.
          </EmptyState>
        </Card>
      ) : (
        <div className={styles.layout}>
          <Card as="section" aria-labelledby="gt" className={styles.total}>
            <h2 id="gt" className={styles.totalTitle}>Overall progress</h2>
            <p className={`${styles.big} num`}>{Math.round(overall.progress * 100)}%</p>
            <ProgressBar value={overall.progress} label="Overall savings progress" tone="positive" />
            <p className={styles.muted}><span className="num">{fmt.money(overall.saved)}</span> saved of <span className="num">{fmt.money(overall.target)}</span></p>
          </Card>
          <ChartCard
            title="Saved versus target"
            description="Each goal compared with its target"
            table={{ caption: 'Savings goals', columns: ['Goal', 'Target', 'Saved', 'Progress'], rows: progress.map((p) => [p.goal.name, fmt.money(p.goal.target), fmt.money(p.goal.saved), `${Math.round(p.progress * 100)}%`]) }}
          >
            <BarChart warnOver={false} label="Saved versus target by goal" seriesLabels={['Target', 'Saved']} formatValue={(v) => fmt.money(v)} data={progress.map((p) => ({ id: p.goal.id, label: p.goal.name, values: [p.goal.target, p.goal.saved] }))} />
          </ChartCard>
          <ul className={`${styles.cards} stagger`}>
            {progress.map((p, i) => (
              <li key={p.goal.id} style={{ '--i': i } as React.CSSProperties}>
                <GoalCard p={p} fmt={fmt} onFund={() => setFunding(p.goal)} onEdit={() => setEditing(p.goal)} onDelete={() => setDeleting(p.goal)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <GoalForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSave={async (g) => { await fin.saveGoal(g); toast.show(editing === 'new' ? 'Goal created' : 'Goal updated') }} />
      )}
      {funding && (
        <FundForm goal={funding} onClose={() => setFunding(null)} onSave={async (amount) => {
          const saved = funding.saved + amount
          await fin.saveGoal({ ...funding, saved })
          toast.show(saved >= funding.target ? `${funding.name} is complete` : 'Savings added')
        }} />
      )}
      {deleting && (
        <ConfirmDialog title="Delete goal?" message={`"${deleting.name}" and its progress will be removed.`} confirmLabel="Delete" onCancel={() => setDeleting(null)}
          onConfirm={async () => { await fin.deleteGoal(deleting.id); toast.show('Goal deleted'); setDeleting(null) }} />
      )}
    </>
  )
}

function GoalCard({ p, fmt, onFund, onEdit, onDelete }: { p: GoalProgress; fmt: ReturnType<typeof useFormat>; onFund: () => void; onEdit: () => void; onDelete: () => void }) {
  const { goal } = p
  return (
    <Card as="article" interactive aria-label={goal.name} className={styles.card}>
      <div className={styles.cardTop}>
        <h3 className={styles.cardTitle}>{goal.name}</h3>
        {p.complete ? <Badge tone="positive" icon={<CircleCheck size={12} aria-hidden="true" />}>Complete</Badge> : p.overdue ? <Badge tone="warning">Past target date</Badge> : null}
      </div>
      <p className={`${styles.cardBig} num`}>{fmt.money(goal.saved)} <span className={styles.muted}>of {fmt.money(goal.target)}</span></p>
      <ProgressBar value={p.progress} label={`${goal.name} progress`} tone={p.complete ? 'positive' : 'accent'} />
      <p className={styles.muted}>
        {Math.round(p.progress * 100)}% · {p.complete ? 'Target reached' : `${fmt.money(p.remaining)} to go`}
      </p>
      {goal.targetDate && !p.complete && (
        <p className={styles.date}>
          <CalendarClock size={14} aria-hidden="true" /> By {fmt.date(goal.targetDate)}
          {p.requiredMonthly !== null && <> · about <span className="num">{fmt.money(p.requiredMonthly)}</span> per month</>}
        </p>
      )}
      <div className={styles.cardActions}>
        {!p.complete && <Button size="sm" icon={<CirclePlus size={14} aria-hidden="true" />} onClick={onFund}>Add savings</Button>}
        <IconButton label={`Edit ${goal.name}`} onClick={onEdit}><Pencil size={16} aria-hidden="true" /></IconButton>
        <IconButton label={`Delete ${goal.name}`} onClick={onDelete}><Trash2 size={16} aria-hidden="true" /></IconButton>
      </div>
    </Card>
  )
}

function GoalForm({ initial, onSave, onClose }: { initial?: SavingsGoal; onSave: (g: SavingsGoal) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? minorToInput(initial.target) : '')
  const [saved, setSaved] = useState(initial ? minorToInput(initial.saved) : '0')
  const [date, setDate] = useState(initial?.targetDate ?? '')
  const [errors, setErrors] = useState<Partial<Record<'name' | 'target' | 'saved' | 'date', string>>>({})
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    const n = cleanText(name, 80)
    const t = parseAmount(target)
    const s = saved.trim() === '' || saved.trim() === '0' ? 0 : parseAmount(saved)
    if (!n) errs.name = 'Give the goal a name.'
    if (t === null) errs.target = 'Enter a target above zero.'
    if (s === null) errs.saved = 'Enter 0 or a positive amount.'
    if (date && !isValidISODate(date)) errs.date = 'Enter a valid date.'
    setErrors(errs)
    if (Object.keys(errs).length || t === null || s === null) return
    setSaving(true)
    try {
      await onSave({ id: initial?.id ?? newId('goal'), name: n, target: t, saved: s, ...(date ? { targetDate: date } : {}), source: initial?.source ?? 'user' })
      onClose()
    } catch {
      setSaving(false)
      setErrors({ name: 'Could not save. Check your browser storage and try again.' })
    }
  }
  return (
    <Modal title={initial ? 'Edit goal' : 'Add savings goal'} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="goal-form" loading={saving}>Save goal</Button></>}>
      <form id="goal-form" onSubmit={submit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <TextField label="Goal name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoFocus />
        <TextField label="Target amount" inputMode="decimal" placeholder="0.00" value={target} onChange={(e) => setTarget(e.target.value)} error={errors.target} />
        <TextField label="Saved so far" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} error={errors.saved} />
        <TextField label="Target date (optional)" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </form>
    </Modal>
  )
}

function FundForm({ goal, onSave, onClose }: { goal: SavingsGoal; onSave: (amount: number) => Promise<void>; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const m = parseAmount(amount)
    if (m === null) return setError('Enter an amount above zero.')
    setSaving(true)
    try {
      await onSave(m)
      onClose()
    } catch {
      setSaving(false)
      setError('Could not save. Check your browser storage and try again.')
    }
  }
  return (
    <Modal size="sm" title={`Add to ${goal.name}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="fund-form" loading={saving}>Add savings</Button></>}>
      <form id="fund-form" onSubmit={submit} noValidate>
        <TextField label="Amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} error={error} autoFocus />
      </form>
    </Modal>
  )
}
