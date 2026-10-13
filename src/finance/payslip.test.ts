import { describe, expect, it } from 'vitest'
import { amountsIn, datesIn, parsePayslip, payslipToJson } from './payslip'

describe('amountsIn', () => {
  it('reads Norwegian, German and English number formats', () => {
    expect(amountsIn('Brutto 52 000,00')).toEqual([5_200_000])
    expect(amountsIn('Brutto 52.000,50')).toEqual([5_200_050])
    expect(amountsIn('Gross 52,000.50')).toEqual([5_200_050])
  })
  it('prefers decimal amounts so a period column of whole numbers is ignored', () => {
    expect(amountsIn('Fastlønn 160 52 000,00')).toEqual([5_200_000])
  })
  it('returns several amounts in order', () => {
    expect(amountsIn('Skattetrekk 14 560,00 126 000,00')).toEqual([1_456_000, 12_600_000])
  })
})

describe('datesIn', () => {
  it('reads dd.mm.yyyy, dd/mm/yy and ISO dates and rejects impossible ones', () => {
    expect(datesIn('Utbetalingsdato 25.10.2026')).toEqual(['2026-10-25'])
    expect(datesIn('Pay date 5/3/26')).toEqual(['2026-03-05'])
    expect(datesIn('2026-10-25')).toEqual(['2026-10-25'])
    expect(datesIn('31.02.2026')).toEqual([])
  })
})

const NORWEGIAN = [
  'Lønnsslipp',
  'Arbeidsgiver: Fjord Konsulent AS',
  'Utbetalingsdato 25.10.2026',
  'Lønnsperiode 01.10.2026 - 31.10.2026',
  'Fastlønn 52 000,00',
  'Bruttolønn 52 000,00 468 000,00',
  'Skattetrekk -14 560,00 -131 040,00',
  'Netto utbetalt 37 440,00',
]

describe('parsePayslip', () => {
  it('extracts net, gross, tax, date, period and employer from a Norwegian payslip', () => {
    const p = parsePayslip(NORWEGIAN)
    expect(p).toMatchObject({
      net: 3_744_000,
      gross: 5_200_000,
      tax: 1_456_000,
      date: '2026-10-25',
      periodFrom: '2026-10-01',
      periodTo: '2026-10-31',
      employer: 'Fjord Konsulent AS',
      netDerived: false,
    })
    expect(p.found).toEqual(expect.arrayContaining(['net', 'gross', 'tax', 'date', 'period', 'employer']))
  })

  it('reads an English payslip', () => {
    const p = parsePayslip(['Employer Acme Ltd', 'Pay date 2026-03-28', 'Gross pay 4,200.00', 'Income tax withheld 980.50', 'Net pay 3,219.50'])
    expect(p).toMatchObject({ net: 321_950, gross: 420_000, tax: 98_050, date: '2026-03-28', employer: 'Acme Ltd' })
  })

  it('calculates net from gross minus tax when no net line exists, and says so', () => {
    const p = parsePayslip(['Bruttolønn 40 000,00', 'Skattetrekk 10 000,00', 'Dato 15.05.2026'])
    expect(p.net).toBe(3_000_000)
    expect(p.netDerived).toBe(true)
    expect(p.found).not.toContain('net')
  })

  it('takes the amount from the next line when the label stands alone', () => {
    expect(parsePayslip(['Netto utbetalt', '37 440,00']).net).toBe(3_744_000)
  })

  it('does not mistake a text line for an amount on the next line', () => {
    expect(parsePayslip(['Netto utbetalt', 'Kontonummer til mottaker 1234']).net).toBeNull()
  })

  it('returns nothing for unrelated text', () => {
    const p = parsePayslip(['Hei, dette er en handleliste', 'melk 24,90'])
    expect(p.net).toBeNull()
    expect(p.gross).toBeNull()
    expect(p.found).toEqual([])
  })

  it('serialises amounts as exact decimal strings', () => {
    const json = payslipToJson(parsePayslip(NORWEGIAN))
    expect(json).toMatchObject({ net: '37440.00', gross: '52000.00', tax: '14560.00', payDate: '2026-10-25', employer: 'Fjord Konsulent AS' })
  })
})
