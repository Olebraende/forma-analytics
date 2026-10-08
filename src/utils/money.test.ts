import { formatMoney, minorToInput, parseAmount } from './money'

describe('parseAmount', () => {
  it.each([
    ['249.90', 24990],
    ['249,90', 24990],
    ['1 234,56', 123456],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['1234', 123400],
    ['kr 99', 9900],
    ['0.05', 5],
    ['5.5', 550],
    ['1.234', 123400],
  ])('parses %s', (input, expected) => expect(parseAmount(input)).toBe(expected))

  it.each(['', 'abc', '0', '-5', '1.2.3,4', '12.3456', '1,2,3', '99999999999999', '1e5', '12,'])('rejects %j', (input) => expect(parseAmount(input)).toBeNull())

  it('avoids floating point drift', () => {
    expect(parseAmount('0.1')! + parseAmount('0.2')!).toBe(30)
    expect(parseAmount('1.15')).toBe(115)
    expect(parseAmount('19.99')).toBe(1999)
  })
})

describe('formatting', () => {
  it('formats minor units', () => {
    expect(formatMoney(123456, 'NOK', 'en-GB').replace(/ /g, ' ')).toBe('NOK 1,234.56')
    expect(formatMoney(100000, 'USD', 'en-US')).toBe('$1,000')
  })
  it('round-trips through form input', () => {
    for (const m of [1, 50, 100, 12345, 99999999]) expect(parseAmount(minorToInput(m))).toBe(m)
  })
})
