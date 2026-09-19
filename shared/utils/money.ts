/** Values passed here have already been validated/canonicalized by the money schema. */
export const moneyCents = (value: string) => {
  const negative = value.startsWith('-'),
    [whole, fraction] = value.replace('-', '').split('.')
  return BigInt(whole! + (fraction ?? '').padEnd(2, '0')) * (negative ? -BigInt('1') : BigInt('1'))
}
export const centsMoney = (value: bigint) => {
  const positive = value < BigInt('0') ? -value : value
  return `${value < BigInt('0') ? '-' : ''}${positive / BigInt('100')}.${String(positive % BigInt('100')).padStart(2, '0')}`
}
