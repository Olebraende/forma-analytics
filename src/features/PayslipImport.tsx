import { useRef, useState, type FormEvent } from 'react'
import { FileUp, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { Collapsible } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { categoriesFor } from '@/data/categories'
import { todayISO } from '@/finance/calc'
import { parsePayslip, payslipToJson, type PayslipData } from '@/finance/payslip'
import { newId, useFinance } from '@/finance/store'
import { cleanText } from '@/finance/validation'
import { useFormat } from '@/app/prefs'
import { useT } from '@/i18n/useT'
import { downloadText } from '@/storage/exchange'
import { extractPdfLines, PdfReadError } from '@/storage/pdfText'
import { isValidISODate } from '@/utils/dates'
import { minorToInput, parseAmount } from '@/utils/money'
import styles from './forms.module.css'

interface Loaded {
  lines: string[]
  data: PayslipData
}

/** Button + file picker + review dialog. The PDF is read in this browser and never uploaded. */
export function PayslipImport() {
  const t = useT()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const lines = await extractPdfLines(file)
      setLoaded({ lines, data: parsePayslip(lines) })
    } catch (e) {
      const code = e instanceof PdfReadError ? e.code : 'failed'
      setError(
        {
          'too-large': t('That PDF is larger than 10 MB.'),
          'not-pdf': t('That file is not a PDF.'),
          protected: t('That PDF is password protected. Remove the password and try again.'),
          'no-text': t('No text was found in that PDF. It may be a scan or a photo, which cannot be read here.'),
          failed: t('The PDF could not be read.'),
        }[code],
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button icon={<FileUp size={16} aria-hidden="true" />} loading={busy} onClick={() => fileRef.current?.click()}>
        {t('Import payslip (PDF)')}
      </Button>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-label={t('Choose a payslip PDF')} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
      {error && (
        <p role="alert" style={{ color: 'var(--negative)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center', margin: 0, fontSize: 'var(--text-label)' }}>
          <TriangleAlert size={16} aria-hidden="true" /> {error}
        </p>
      )}
      {loaded && (
        <PayslipReview
          loaded={loaded}
          onClose={() => setLoaded(null)}
          onSaved={() => toast.show(t('Salary added from payslip'))}
        />
      )}
    </>
  )
}

function PayslipReview({ loaded, onClose, onSaved }: { loaded: Loaded; onClose: () => void; onSaved: () => void }) {
  const t = useT()
  const fmt = useFormat()
  const fin = useFinance()
  const { data, lines } = loaded
  const incomeCategories = categoriesFor('income')
  const [amount, setAmount] = useState(data.net !== null ? minorToInput(data.net) : '')
  const [date, setDate] = useState(data.date ?? todayISO())
  const [description, setDescription] = useState(data.employer ? `${t('Salary')} ${data.employer}` : t('Salary'))
  const [categoryId, setCategoryId] = useState('salary')
  const [errors, setErrors] = useState<Partial<Record<'amount' | 'date' | 'description', string>>>({})
  const [saving, setSaving] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [showText, setShowText] = useState(false)

  const json = JSON.stringify(payslipToJson(data), null, 2)
  const nothingFound = data.net === null && data.gross === null && data.tax === null
  const minor = parseAmount(amount)
  const duplicate = minor !== null && fin.transactions.some((x) => x.type === 'income' && x.date === date && x.amount === minor)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    const desc = cleanText(description)
    if (minor === null) errs.amount = t('Enter an amount above zero, such as 249.90.')
    if (!isValidISODate(date)) errs.date = t('Enter a valid date.')
    if (!desc) errs.description = t('Add a short description.')
    setErrors(errs)
    if (Object.keys(errs).length || minor === null) return
    setSaving(true)
    try {
      await fin.saveTransaction({ id: newId('tx'), type: 'income', amount: minor, categoryId, date, description: desc, source: 'user', createdAt: new Date().toISOString() })
      onSaved()
      onClose()
    } catch {
      setSaving(false)
      setErrors({ amount: t('Could not save.') })
    }
  }

  const row = (label: string, value: string | null, note?: string) => (
    <li>
      <span>{label}</span>
      <strong className="num">{value ?? t('Not found')}</strong>
      {note && <span> ({note})</span>}
    </li>
  )

  return (
    <Modal
      title={t('Review payslip')}
      description={t('Check the values read from the PDF before saving. Nothing has been saved yet.')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" type="submit" form="payslip-form" loading={saving}>{t('Add as income')}</Button>
        </>
      }
    >
      <div className={styles.form}>
        <p className={styles.saveError} role="note" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
          {t('The text is read automatically and payslip layouts differ, so the values are only a suggestion. Compare them with the PDF.')}
        </p>
        {nothingFound && <p className={styles.saveError} role="alert">{t('No payslip amounts were recognised. You can still enter the values by hand.')}</p>}
        <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', display: 'grid', gap: 'var(--space-1)' }} aria-label={t('Read from the PDF')}>
          {row(t('Net pay'), data.net !== null ? fmt.money(data.net) : null, data.netDerived ? t('calculated as gross minus tax') : undefined)}
          {row(t('Gross pay'), data.gross !== null ? fmt.money(data.gross) : null)}
          {row(t('Tax withheld'), data.tax !== null ? fmt.money(data.tax) : null)}
          {row(t('Pay date'), data.date ? fmt.date(data.date) : null)}
          {row(t('Employer'), data.employer)}
        </ul>
        <form id="payslip-form" onSubmit={submit} noValidate className={styles.form}>
          <TextField label={t('Amount to record as income')} inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} hint={t('Net pay is what reaches your bank account.')} autoFocus />
          <div className={styles.row2}>
            <TextField label={t('Date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
            <SelectField label={t('Category')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {incomeCategories.map((c) => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
            </SelectField>
          </div>
          <TextField label={t('Description')} maxLength={120} autoComplete="off" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
          {duplicate && <p className={styles.saveError} role="status">{t('A similar income already exists on this date. Saving will add another one.')}</p>}
        </form>
        <Collapsible label={t('Extracted data (JSON)')} open={showJson} onToggle={setShowJson}>
          <pre style={{ margin: 0, overflow: 'auto', fontSize: 'var(--text-label)' }} tabIndex={0}>{json}</pre>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <Button size="sm" onClick={() => downloadText(`forma-payslip-${data.date ?? todayISO()}.json`, json, 'application/json')}>{t('Download JSON')}</Button>
          </div>
        </Collapsible>
        <Collapsible label={t('Text read from the PDF')} open={showText} onToggle={setShowText}>
          <pre style={{ margin: 0, overflow: 'auto', maxHeight: '14rem', fontSize: 'var(--text-label)', whiteSpace: 'pre-wrap' }} tabIndex={0}>{lines.join('\n')}</pre>
        </Collapsible>
      </div>
    </Modal>
  )
}
