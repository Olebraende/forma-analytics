import { useRef, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Misc'
import { categoriesFor } from '@/data/categories'
import { cleanText } from '@/finance/validation'
import { newId } from '@/finance/store'
import { isValidISODate } from '@/utils/dates'
import { minorToInput, parseAmount } from '@/utils/money'
import type { Transaction, TransactionType } from '@/types/models'
import { todayISO } from '@/finance/calc'
import styles from './forms.module.css'

type Field = 'amount' | 'category' | 'date' | 'description'

export function TransactionForm({ initial, onSave, onClose }: { initial?: Transaction; onSave: (t: Transaction) => Promise<void>; onClose: () => void }) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? minorToInput(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const categories = categoriesFor(type)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Partial<Record<Field, string>> = {}
    const minor = parseAmount(amount)
    if (minor === null) errs.amount = 'Enter an amount above zero, such as 249.90.'
    if (!categories.some((c) => c.id === categoryId)) errs.category = 'Choose a category.'
    if (!isValidISODate(date)) errs.date = 'Enter a valid date.'
    const desc = cleanText(description)
    if (!desc) errs.description = 'Add a short description.'
    setErrors(errs)
    if (Object.keys(errs).length > 0 || minor === null) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        id: initial?.id ?? newId('tx'),
        type,
        amount: minor,
        categoryId,
        date,
        description: desc,
        source: initial?.source ?? 'user',
        createdAt: initial?.createdAt ?? new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit transaction' : 'Add transaction'}
      description="Amounts are stored in this browser only."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="tx-form" loading={saving}>
            {initial ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id="tx-form" ref={formRef} onSubmit={submit} noValidate className={styles.form}>
        <div className={styles.group}>
          <span className={styles.groupLabel} id="tx-type-label">
            Type
          </span>
          <Segmented
            name="tx-type"
            label="Transaction type"
            value={type}
            options={[
              { id: 'expense', label: 'Expense' },
              { id: 'income', label: 'Income' },
            ]}
            onChange={(v) => {
              setType(v)
              setCategoryId('')
            }}
          />
        </div>
        <TextField label="Amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} autoFocus />
        <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.category}>
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <TextField label="Description" maxLength={120} autoComplete="off" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
        {saveError && (
          <p role="alert" className={styles.saveError}>
            {saveError}
          </p>
        )}
      </form>
    </Modal>
  )
}
