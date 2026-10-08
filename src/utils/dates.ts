export const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function parseISO(iso: string): Date {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const isValidISODate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseISO(s)
  return toISO(d) === s && d.getFullYear() >= 1970 && d.getFullYear() <= 2100
}

/** YYYY-MM key of an ISO date. */
export const monthKey = (iso: string) => iso.slice(0, 7)

export const monthStart = (key: string) => `${key}-01`

export function monthEnd(key: string): string {
  const [y = 1970, m = 1] = key.split('-').map(Number)
  return toISO(new Date(y, m, 0))
}

export function addMonths(key: string, delta: number): string {
  const [y = 1970, m = 1] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** Inclusive list of month keys between two month keys. */
export function monthsBetween(fromKey: string, toKey: string): string[] {
  const out: string[] = []
  let cur = fromKey
  while (cur <= toKey && out.length < 600) {
    out.push(cur)
    cur = addMonths(cur, 1)
  }
  return out
}

export function formatMonth(key: string, locale = 'en-GB', style: 'short' | 'long' = 'short'): string {
  const [y = 1970, m = 1] = key.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, {
    month: style,
    year: style === 'long' ? 'numeric' : '2-digit',
  }).format(new Date(y, m - 1, 1))
}

export const formatDate = (iso: string, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(parseISO(iso))

export function daysBetween(fromISO: string, toISO_: string): number {
  return Math.round((parseISO(toISO_).getTime() - parseISO(fromISO).getTime()) / 86_400_000)
}
