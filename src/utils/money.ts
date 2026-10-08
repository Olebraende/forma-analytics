import type { Minor } from '@/types/models'

export const CURRENCIES = ['NOK', 'EUR', 'USD', 'GBP', 'SEK', 'DKK'] as const
export type Currency = (typeof CURRENCIES)[number]

/** Every supported currency uses two minor-unit digits. */
const MINOR_DIGITS = 2
const MAX_MINOR = 999_999_999_999 // 9 999 999 999.99

/**
 * Parses user input such as "1 234,56", "1234.5" or "kr 99" into minor units
 * using string arithmetic only. Returns null for anything ambiguous or invalid.
 *
 * Rules: spaces are ignored; the last "," or "." is a decimal separator when
 * followed by 1-2 digits, and a thousands separator when followed by exactly 3.
 */
export function parseAmount(input: string): Minor | null {
  const cleaned = input.replace(/[\s\u00a0\u202f]/g, '').replace(/^[^\d,.-]+|[^\d,.]+$/g, '')
  if (!/^\d[\d,.]*$/.test(cleaned)) return null
  const sep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  let whole = cleaned
  let frac = ''
  if (sep !== -1) {
    const tail = cleaned.slice(sep + 1)
    const head = cleaned.slice(0, sep)
    if (tail.length === 3) {
      whole = cleaned.replace(/[,.]/g, '')
    } else if (tail.length === 1 || tail.length === 2) {
      // The decimal separator may not also appear as a grouping separator.
      if (head.includes(cleaned[sep] as string)) return null
      whole = head.replace(/[,.]/g, '')
      frac = tail
    } else {
      return null
    }
  }
  if (!/^\d+$/.test(whole)) return null
  const minor = Number(whole) * 100 + Number(frac.padEnd(MINOR_DIGITS, '0'))
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > MAX_MINOR) return null
  return minor
}

export function formatMoney(
  minor: Minor,
  currency: Currency = 'NOK',
  locale = 'en-GB',
  opts: { compact?: boolean; signed?: boolean; fractionDigits?: 0 | 2 } = {},
): string {
  const value = minor / 10 ** MINOR_DIGITS
  const fd = opts.fractionDigits ?? (Number.isInteger(value) ? 0 : 2)
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    minimumFractionDigits: opts.compact ? 0 : fd,
    maximumFractionDigits: opts.compact ? 1 : fd,
    signDisplay: opts.signed ? 'exceptZero' : 'auto',
  })
  return fmt.format(value)
}

/** Plain decimal string for forms, e.g. 123456 -> "1234.56". */
export function minorToInput(minor: Minor): string {
  const abs = Math.abs(minor)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return frac === '00' ? String(whole) : `${whole}.${frac}`
}

export const formatPercent = (ratio: number, locale = 'en-GB') =>
  new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(ratio)

/** Integer percentage of part/total, rounded, safe for zero totals. */
export const ratio = (part: number, total: number) => (total > 0 ? part / total : 0)
