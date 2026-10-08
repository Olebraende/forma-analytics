import { useRef, useState, type ReactNode } from 'react'
import { Database, Download, FileDown, FileUp, Info, Palette, RotateCcw, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { usePrefs } from '@/app/prefs'
import { useFinance } from '@/finance/store'
import { buildExport, downloadText, MAX_IMPORT_BYTES, previewImport, transactionsToCsv, type ImportPreview } from '@/storage/exchange'
import { LOCALES } from '@/storage/prefs'
import { THEMES, seasonalTheme } from '@/themes/themes'
import { CURRENCIES, type Currency } from '@/utils/money'
import { formatDate } from '@/utils/dates'
import styles from './settings.module.css'

type Confirm = 'remove-demo' | 'reset-demo' | 'clear-all' | null

export default function Settings() {
  const { prefs, update, theme } = usePrefs()
  const fin = useFinance()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const season = seasonalTheme(new Date())
  const stamp = () => new Date().toISOString().slice(0, 10)
  const counts = `${fin.transactions.length} transactions, ${fin.budgets.length} budgets, ${fin.goals.length} goals`

  const exportJson = () => {
    downloadText(`forma-backup-${stamp()}.json`, JSON.stringify(buildExport({ transactions: fin.transactions, budgets: fin.budgets, goals: fin.goals }), null, 2), 'application/json')
    update({ lastBackup: new Date().toISOString() })
    toast.show('Backup downloaded')
  }
  const exportCsv = () => {
    downloadText(`forma-transactions-${stamp()}.csv`, transactionsToCsv(fin.transactions), 'text/csv;charset=utf-8')
    toast.show('CSV downloaded')
  }
  const onFile = async (file: File | undefined) => {
    setImportError(null)
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) return setImportError('That file is larger than 10 MB, which is far beyond a normal backup.')
    const result = previewImport(await file.text(), fin)
    if (!result.ok) return setImportError(result.error)
    setPreview(result.preview)
  }
  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn()
      toast.show(ok)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Something went wrong', 'error')
    }
  }

  const days = prefs.lastBackup ? Math.floor((Date.now() - Date.parse(prefs.lastBackup)) / 86_400_000) : null

  return (
    <>
      <PageHeader title="Settings" description="Appearance, regional formats, data and privacy." />
      <div className={styles.stack}>
        <Card as="section" aria-labelledby="s-appearance">
          <CardHeader id="s-appearance" title="Appearance" description="Choose a theme. Changes apply instantly." />
          <div role="radiogroup" aria-label="Theme" className={styles.themes}>
            <ThemeOption id="auto" name="Automatic" description={prefs.seasonal ? 'System, plus seasonal themes' : 'Follows your system'} swatch={['var(--bg)', 'var(--surface)', 'var(--accent)']} checked={prefs.theme === 'auto'} onSelect={() => update({ theme: 'auto' })} icon={<Palette size={16} aria-hidden="true" />} />
            {THEMES.map((t) => (
              <ThemeOption key={t.id} id={t.id} name={t.name} description={t.description} swatch={t.swatch} checked={prefs.theme === t.id} onSelect={() => update({ theme: t.id })} icon={<t.icon size={16} aria-hidden="true" />} />
            ))}
          </div>
          <div className={styles.toggles}>
            <Toggle label="Switch to seasonal themes automatically" description={prefs.theme === 'auto' ? `Summer, Christmas, Halloween and April Fools activate on their dates.${season ? ` Today qualifies for ${THEMES.find((t) => t.id === season)?.name}.` : ''}` : 'Choose Automatic above to enable. A manually selected theme always wins.'} checked={prefs.seasonal} disabled={prefs.theme !== 'auto'} onChange={(v) => update({ seasonal: v })} />
            <Toggle label="Decorative seasonal effects" description="Subtle background marks in seasonal themes." checked={prefs.decorations} onChange={(v) => update({ decorations: v })} />
          </div>
          <div className={styles.fields}>
            <SelectField label="Motion" value={prefs.motion} onChange={(e) => update({ motion: e.target.value as 'system' | 'reduce' })} hint="Following the system respects your operating system's reduced-motion setting.">
              <option value="system">Follow system setting</option>
              <option value="reduce">Reduce motion</option>
            </SelectField>
          </div>
          <p className={styles.note}>Active theme: <strong>{THEMES.find((t) => t.id === theme)?.name}</strong></p>
        </Card>

        <Card as="section" aria-labelledby="s-regional">
          <CardHeader id="s-regional" title="Currency and locale" description="Amounts are stored as whole minor units, so changing currency only changes how they are displayed. No conversion is applied." />
          <div className={styles.fields}>
            <SelectField label="Currency" value={prefs.currency} onChange={(e) => update({ currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectField>
            <SelectField label="Locale" value={prefs.locale} onChange={(e) => update({ locale: e.target.value })} hint="Controls number, date and month formatting.">
              {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </SelectField>
          </div>
        </Card>

        <Card as="section" aria-labelledby="s-data">
          <CardHeader id="s-data" title="Backup, export and import" description={`Currently stored: ${counts}.`} />
          <div className={styles.notice} data-tone={days === null || days > 30 ? 'warn' : 'ok'}>
            <Info size={18} aria-hidden="true" />
            <p>
              {prefs.lastBackup ? `Last backup: ${formatDate(prefs.lastBackup.slice(0, 10), prefs.locale)} (${days === 0 ? 'today' : `${days} days ago`}).` : 'You have not exported a backup yet.'} Browser data can be lost if site storage is cleared, so export a backup regularly.
            </p>
          </div>
          <div className={styles.actions}>
            <Button icon={<Download size={16} aria-hidden="true" />} onClick={exportJson}>Download backup (JSON)</Button>
            <Button icon={<FileDown size={16} aria-hidden="true" />} onClick={exportCsv} disabled={fin.transactions.length === 0}>Export transactions (CSV)</Button>
            <Button icon={<FileUp size={16} aria-hidden="true" />} onClick={() => fileRef.current?.click()}>Import backup</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Choose a backup file to import" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {importError && <p role="alert" className={styles.error}><TriangleAlert size={16} aria-hidden="true" /> {importError}</p>}
        </Card>

        <Card as="section" aria-labelledby="s-demo">
          <CardHeader id="s-demo" title="Demo data" description="Fictional records for exploring the app. They are labelled and never mixed up with your own." action={fin.hasDemo ? <Badge tone="accent">Demo data present</Badge> : <Badge>None loaded</Badge>} />
          <div className={styles.actions}>
            <Button icon={<Database size={16} aria-hidden="true" />} onClick={() => void run(fin.loadDemo, 'Demo data loaded')} disabled={fin.hasDemo}>Load demo data</Button>
            <Button icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => setConfirm('reset-demo')} disabled={!fin.hasDemo}>Reset demo data</Button>
            <Button icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirm('remove-demo')} disabled={!fin.hasDemo}>Remove demo data</Button>
          </div>
          <p className={styles.note}>{fin.hasUserData ? 'Your own records are kept when demo data is removed or reset.' : 'You have no records of your own yet.'}</p>
        </Card>

        <Card as="section" aria-labelledby="s-privacy">
          <CardHeader id="s-privacy" title="Privacy" />
          <ul className={styles.privacy}>
            <li><ShieldCheck size={18} aria-hidden="true" /><span>Everything runs in your browser. Your financial data is never sent to a server, and the app makes no analytics or tracking requests.</span></li>
            <li><Database size={18} aria-hidden="true" /><span>Data is saved in this browser&apos;s IndexedDB. It is <strong>not encrypted</strong>, and anyone with access to this browser profile can read it. Avoid using the app on shared or untrusted devices.</span></li>
            <li><TriangleAlert size={18} aria-hidden="true" /><span>Clearing site data, using private browsing or switching browsers removes or hides your records. Keep a backup.</span></li>
          </ul>
        </Card>

        <Card as="section" aria-labelledby="s-danger" className={styles.danger}>
          <CardHeader id="s-danger" title="Delete all data" description="Permanently removes every transaction, budget and goal from this browser, including demo data." />
          <Button variant="danger" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setConfirm('clear-all')}>Delete everything</Button>
        </Card>
      </div>

      {preview && (
        <ImportDialog preview={preview} onClose={() => setPreview(null)}
          onMerge={() => run(async () => { await fin.addRecords(preview.fresh) }, `Imported ${preview.fresh.transactions.length + preview.fresh.budgets.length + preview.fresh.goals.length} records`)}
          onReplace={() => run(async () => { await fin.replaceAll({ transactions: preview.incoming.transactions, budgets: preview.incoming.budgets, goals: preview.incoming.goals }) }, 'All data replaced from backup')} />
      )}
      {confirm === 'remove-demo' && <ConfirmDialog title="Remove demo data?" message="Only the fictional demo records are deleted. Anything you added is kept." confirmLabel="Remove demo data" onCancel={() => setConfirm(null)} onConfirm={async () => { await run(fin.removeDemo, 'Demo data removed'); setConfirm(null) }} />}
      {confirm === 'reset-demo' && <ConfirmDialog tone="primary" title="Reset demo data?" message="Demo records return to their original state. Your own records are not touched." confirmLabel="Reset demo data" onCancel={() => setConfirm(null)} onConfirm={async () => { await run(fin.resetDemo, 'Demo data reset'); setConfirm(null) }} />}
      {confirm === 'clear-all' && <ConfirmDialog title="Delete all data?" message={`This permanently deletes ${counts}. Download a backup first if you might need it.`} confirmLabel="Delete everything" onCancel={() => setConfirm(null)} onConfirm={async () => { await run(fin.clearAll, 'All data deleted'); setConfirm(null) }} />}
    </>
  )
}

function ThemeOption({ id, name, description, swatch, checked, onSelect, icon }: { id: string; name: string; description: string; swatch: readonly string[]; checked: boolean; onSelect: () => void; icon: ReactNode }) {
  return (
    <label className={styles.theme} data-checked={checked || undefined}>
      <input type="radio" name="theme" value={id} checked={checked} onChange={onSelect} className={styles.themeInput} />
      <span className={styles.swatch} aria-hidden="true">
        {swatch.map((c, i) => <span key={i} style={{ background: c }} />)}
      </span>
      <span className={styles.themeName}>{icon}{name}</span>
      <span className={styles.themeDesc}>{description}</span>
    </label>
  )
}

function Toggle({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={styles.toggle} data-disabled={disabled || undefined}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className={styles.switchInput} />
      <span className={styles.switchTrack} aria-hidden="true"><span className={styles.switchThumb} /></span>
      <span>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.themeDesc}>{description}</span>
      </span>
    </label>
  )
}

function ImportDialog({ preview, onClose, onMerge, onReplace }: { preview: ImportPreview; onClose: () => void; onMerge: () => Promise<void>; onReplace: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const f = preview.fresh
  const freshCount = f.transactions.length + f.budgets.length + f.goals.length
  const go = async (fn: () => Promise<void>) => {
    setBusy(true)
    await fn()
    onClose()
  }
  return (
    <Modal title="Import backup" description="Review what the file contains before anything is changed." onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {confirmReplace ? (
            <Button variant="danger" loading={busy} onClick={() => void go(onReplace)}>Replace everything</Button>
          ) : (
            <>
              <Button onClick={() => setConfirmReplace(true)} disabled={busy}>Replace all data</Button>
              <Button variant="primary" loading={busy} onClick={() => void go(onMerge)} disabled={freshCount === 0}>Add {freshCount} new records</Button>
            </>
          )}
        </>
      }>
      <ul className={styles.previewList}>
        <li><strong className="num">{f.transactions.length}</strong> new transactions of {preview.incoming.transactions.length}</li>
        <li><strong className="num">{f.budgets.length}</strong> new budgets of {preview.incoming.budgets.length}</li>
        <li><strong className="num">{f.goals.length}</strong> new goals of {preview.incoming.goals.length}</li>
      </ul>
      {preview.duplicates > 0 && <p className={styles.note}>{preview.duplicates} records already exist and will be skipped when adding.</p>}
      {preview.errors.length > 0 && (
        <div className={styles.error} role="status">
          <TriangleAlert size={16} aria-hidden="true" />
          <div>
            <p>{preview.errors.length} entries were invalid and will be ignored:</p>
            <ul>{preview.errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        </div>
      )}
      {confirmReplace && <p className={styles.error} role="alert"><TriangleAlert size={16} aria-hidden="true" /> Replacing deletes all current data first. Download a backup if you have not already.</p>}
    </Modal>
  )
}
