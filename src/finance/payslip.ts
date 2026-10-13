import { isValidISODate, pad } from '@/utils/dates'
import { parseAmount } from '@/utils/money'
import type { Minor } from '@/types/models'

/**
 * Best-effort reading of a payslip (lønnsslipp) from its text. It looks for common Norwegian and
 * English labels and takes the first amount after each. Payslip layouts differ a lot, so the result
 * is only ever a suggestion that the person reviews before anything is saved.
 */
export interface PayslipData {
  /** Amount paid out (net), in minor units. */
  net: Minor | null
  gross: Minor | null
  /** Tax withheld, as a positive amount. */
  tax: Minor | null
  /** Pay date, ISO. */
  date: string | null
  periodFrom: string | null
  periodTo: string | null
  employer: string | null
  /** Names of the fields that were read from the text (as opposed to derived). */
  found: Array<'net' | 'gross' | 'tax' | 'date' | 'period' | 'employer'>
  /** True when net was calculated as gross minus tax because no net amount was labelled. */
  netDerived: boolean
}

const AMOUNT = /-?\d{1,3}(?:[ \u00a0\u202f.,]\d{3})+(?:[.,]\d{1,2})?|-?\d+(?:[.,]\d{1,2})?/g
const DATE = /\b(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g

/** All money-like numbers on a line, in reading order. Decimal amounts come first when present. */
export function amountsIn(line: string): Minor[] {
  const out: { v: Minor; decimal: boolean }[] = []
  for (const m of line.matchAll(AMOUNT)) {
    const raw = m[0].replace(/^-/, '')
    const v = parseAmount(raw)
    if (v !== null) out.push({ v, decimal: /[.,]\d{1,2}$/.test(raw) })
  }
  const dec = out.filter((o) => o.decimal)
  return (dec.length ? dec : out).map((o) => o.v)
}

export function datesIn(line: string): string[] {
  const out: string[] = []
  for (const m of line.matchAll(DATE)) {
    let iso: string
    if (m[4]) iso = `${m[4]}-${m[5]}-${m[6]}`
    else {
      const year = (m[3] as string).length === 2 ? `20${m[3]}` : (m[3] as string)
      iso = `${year}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`
    }
    if (isValidISODate(iso)) out.push(iso)
  }
  return out
}

const NET = [/netto\s+utbetal/i, /til\s+utbetaling/i, /netto\s+l[øo]nn/i, /utbetalt(?!\s*dato)/i, /\bnet\s+(pay|salary|amount)/i, /take[- ]home/i]
const GROSS = [/bruttol[øo]nn/i, /brutto\s+l[øo]nn/i, /sum\s+brutto/i, /\bbrutto\b(?!\s*trekk)/i, /\bgross\s+(pay|salary|amount)/i]
const TAX = [/skattetrekk/i, /forskuddstrekk/i, /forskuddsskatt/i, /\b(income\s+)?tax\s+(withheld|deducted)/i, /\bincome\s+tax\b/i, /\bPAYE\b/]
const PAYDATE = /utbetalingsdato|dato\s+for\s+utbetaling|utbetales|utbetalt\s*dato|pay\s*date|payment\s*date|date\s+paid/i
const PERIOD = /l[øo]nnsperiode|periode|pay\s*period/i
const EMPLOYER = /arbeidsgiver|firma|selskap|employer|company/i

function firstAmountFor(lines: string[], patterns: RegExp[]): Minor | null {
  for (const re of patterns) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] as string
      const hit = re.exec(line)
      if (!hit) continue
      const after = line.slice(hit.index + hit[0].length)
      const here = amountsIn(after)
      if (here.length) return here[0] as Minor
      // The amount sometimes sits on the next line of a two-line cell.
      const next = amountsIn((lines[i + 1] as string | undefined) ?? '')
      if (next.length && !/[A-Za-zÆØÅæøå]{4,}/.test((lines[i + 1] as string) ?? '')) return next[0] as Minor
    }
  }
  return null
}

function employerFrom(lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string
    const hit = EMPLOYER.exec(line)
    if (!hit) continue
    const same = line.slice(hit.index + hit[0].length).replace(/^[\s:–-]+/, '').trim()
    const candidate = same || ((lines[i + 1] as string | undefined) ?? '').trim()
    const clean = candidate.replace(/\s{2,}.*/, '').trim()
    if (clean && clean.length <= 60 && /[A-Za-zÆØÅæøå]/.test(clean) && !EMPLOYER.test(clean)) return clean
  }
  return null
}

export function parsePayslip(lines: string[]): PayslipData {
  const found: PayslipData['found'] = []
  const gross = firstAmountFor(lines, GROSS)
  const taxRaw = firstAmountFor(lines, TAX)
  let net = firstAmountFor(lines, NET)
  let netDerived = false
  if (net === null && gross !== null && taxRaw !== null && gross > taxRaw) {
    net = gross - taxRaw
    netDerived = true
  }
  if (net !== null && !netDerived) found.push('net')
  if (gross !== null) found.push('gross')
  if (taxRaw !== null) found.push('tax')

  let date: string | null = null
  for (const line of lines) {
    if (PAYDATE.test(line)) {
      const d = datesIn(line)[0]
      if (d) {
        date = d
        break
      }
    }
  }
  let periodFrom: string | null = null
  let periodTo: string | null = null
  for (const line of lines) {
    if (PERIOD.test(line)) {
      const ds = datesIn(line)
      if (ds.length >= 2) {
        periodFrom = ds[0] as string
        periodTo = ds[ds.length - 1] as string
        break
      }
    }
  }
  if (date) found.push('date')
  else if (periodTo) date = periodTo
  else {
    const any = lines.flatMap(datesIn)[0]
    if (any) date = any
  }
  if (periodFrom) found.push('period')
  const employer = employerFrom(lines)
  if (employer) found.push('employer')
  return { net, gross, tax: taxRaw, date, periodFrom, periodTo, employer, found, netDerived }
}

/** Plain JSON for the person to keep or reuse; amounts are decimal strings, not floats. */
export function payslipToJson(p: PayslipData): Record<string, unknown> {
  const dec = (m: Minor | null) => (m === null ? null : `${Math.floor(m / 100)}.${pad(m % 100)}`)
  return {
    type: 'payslip',
    net: dec(p.net),
    gross: dec(p.gross),
    tax: dec(p.tax),
    payDate: p.date,
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    employer: p.employer,
    netCalculatedFromGrossMinusTax: p.netDerived,
  }
}
