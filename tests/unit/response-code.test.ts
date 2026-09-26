import { describe, expect, it } from 'vitest'
import {
  organizationCode,
  organizationNumber,
  responseCode,
  responseCodes
} from '../../shared/utils/response-code'

describe('response public codes', () => {
  it('keeps a stable uppercase body without ambiguous characters', () => {
    const code = responseCode(42, 'claim')
    expect(code).toMatch(/^C-[A-HJKMNP-Z2-9]{5,}$/)
    expect(responseCode('42', 'claim')).toBe(code)
    expect(responseCode(43, 'claim')).not.toBe(code)
  })

  it('uses a category prefix for the same persisted number', () => {
    const codes = responseCodes(42, ['claim', 'forecast', 'survey'])
    expect(codes.claim).toMatch(/^C-[A-HJKMNP-Z2-9]{5,}$/)
    expect(codes.forecast).toBe(`F-${codes.claim!.slice(2)}`)
    expect(codes.other).toBe(`K-${codes.claim!.slice(2)}`)
    expect(organizationCode(42)).toBe(`N-${codes.claim!.slice(2)}`)
    expect(organizationNumber(organizationCode(42))).toBe(42)
    expect(organizationNumber('0199a000-0000-7000-8000-000000000001')).toBeNull()
  })

  it('rejects numbers that Sqids cannot represent exactly', () => {
    expect(() => responseCode(0, 'claim')).toThrow(RangeError)
    expect(() => responseCode('9007199254740993', 'other')).toThrow(RangeError)
  })
})
