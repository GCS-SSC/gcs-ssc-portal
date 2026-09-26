/** Format exact decimal strings without converting large agreement amounts to a float. */
export const formatCurrency = (value: string, currency: string, locale: 'en' | 'fr') => {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) return value
  const [, sign, whole, fraction = ''] = match
  const formatter = new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const integer = BigInt(whole!)
  const amount = sign && integer === 0n ? -0.01 : sign ? -integer : integer
  return formatter
    .formatToParts(amount)
    .map((part) => (part.type === 'fraction' ? fraction.padEnd(2, '0') : part.value))
    .join('')
}
