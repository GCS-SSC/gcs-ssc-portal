import Sqids from 'sqids'

export type ResponseCategory = 'claim' | 'forecast' | 'other'
export type ResponseCodes = Partial<Record<ResponseCategory, string>>

const sqids = new Sqids({ alphabet: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', minLength: 5 })
const prefix: Record<ResponseCategory, string> = { claim: 'C', forecast: 'F', other: 'K' }

export const encodeNumber = (id: string | number) => {
  const number = Number(id)
  if (!Number.isSafeInteger(number) || number < 1)
    throw new RangeError('ID must be a positive safe integer')
  return sqids.encode([number])
}

export const publicCode = (id: string | number, prefix: string) => `${prefix}-${encodeNumber(id)}`

export const publicCompoundCode = (numbers: readonly number[], prefix: string) => {
  if (!numbers.length || numbers.some((number) => !Number.isSafeInteger(number) || number < 1))
    throw new RangeError('All code components must be positive safe integers')
  return `${prefix}-${sqids.encode([...numbers])}`
}

export const publicNumber = (code: string, prefix: string): number | null => {
  if (!/^[A-Z]-[A-HJKMNP-Z2-9]{5,}$/.test(code) || !code.startsWith(`${prefix}-`)) return null
  const numbers = sqids.decode(code.slice(2))
  const number = numbers.length === 1 ? numbers[0] : null
  return number && Number.isSafeInteger(number) && publicCode(number, prefix) === code
    ? number
    : null
}

export const organizationCode = (id: string | number) => publicCode(id, 'N')

export const organizationNumber = (code: string): number | null => publicNumber(code, 'N')

export const responseCode = (id: string | number, category: ResponseCategory) =>
  publicCode(id, prefix[category])

export const responseNumber = (code: string): number | null => {
  const category = (Object.keys(prefix) as ResponseCategory[]).find((candidate) =>
    code.startsWith(`${prefix[candidate]}-`)
  )
  return category ? publicNumber(code, prefix[category]) : null
}

export const responseCategory = (
  kinds: ReadonlyArray<'claim' | 'forecast' | 'survey'>
): ResponseCategory =>
  kinds.includes('claim') ? 'claim' : kinds.includes('forecast') ? 'forecast' : 'other'

export const primaryResponseCode = (
  id: string | number,
  kinds: ReadonlyArray<'claim' | 'forecast' | 'survey'>
) => responseCode(id, responseCategory(kinds))

export const responseCodes = (
  id: string | number,
  kinds: ReadonlyArray<'claim' | 'forecast' | 'survey'>
): ResponseCodes => {
  const codes: ResponseCodes = {}
  for (const kind of kinds) {
    const category = kind === 'survey' ? 'other' : kind
    codes[category] = responseCode(id, category)
  }
  return codes
}
