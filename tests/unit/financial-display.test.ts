import { expect, it } from 'vitest'
import { formatCurrency } from '../../app/utils/financial-display'

it('formats exact amounts and fractional negative corrections without losing cents', () => {
  expect(formatCurrency('80000.00', 'cad', 'en')).toContain('80,000.00')
  expect(formatCurrency('9007199254740993.25', 'cad', 'en')).toContain('9,007,199,254,740,993.25')
  expect(formatCurrency('-0.05', 'cad', 'en')).toContain('-$0.05')
  expect(formatCurrency('1250.50', 'cad', 'fr')).toContain('1 250,50')
})
