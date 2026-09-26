import { describe, expect, it } from 'vitest'
import {
  decodePublicId,
  encodePublicId,
  publicReferences,
  resolvePublicInput
} from '../../server/utils/public-identifiers'
import { primaryResponseCode } from '../../shared/utils/response-code'

describe('public identifier boundary', () => {
  it('uses canonical uppercase Sqids for organization, agreement, and set references', () => {
    const payload = publicReferences({
      agreement: { id: 11, organizationId: 3, streamId: 5 },
      set: { id: 12, organizationId: 3, agreementId: 11 }
    })
    expect(payload.agreement.id).toMatch(/^A-[A-HJKMNP-Z2-9]{5,}$/)
    expect(payload.agreement.organizationId).toBe(encodePublicId(3, 'organization'))
    expect(payload.set.agreementId).toBe(payload.agreement.id)
    expect(decodePublicId(String(payload.set.id), 'set')).toBe(12)
    expect(() => decodePublicId(String(11), 'agreement')).toThrow()
    expect(() => decodePublicId(String(payload.set.id), 'agreement')).toThrow()
  })

  it('encodes response, user, and attachment references in nested API data', () => {
    const code = primaryResponseCode(7, ['claim', 'survey'])
    const payload = publicReferences({
      response: {
        id: 7,
        organizationId: 3,
        snapshot: { items: [{ item: { kind: 'claim' } }, { item: { kind: 'survey' } }] }
      },
      details: [{ id: 2, attachmentIds: [4] }],
      user: { id: 8 }
    })
    expect(payload.response.id).toBe(code)
    expect(payload.details[0]!.attachmentIds).toEqual([encodePublicId(4, 'attachment')])
    expect(payload.user.id).toBe(encodePublicId(8, 'user'))
  })

  it('decodes public request references and rejects raw numeric IDs', () => {
    const input = resolvePublicInput({
      organizationId: encodePublicId(3, 'organization'),
      agreementId: encodePublicId(11, 'agreement'),
      attachmentIds: [encodePublicId(4, 'attachment')]
    })
    expect(input).toEqual({ organizationId: 3, agreementId: 11, attachmentIds: [4] })
    expect(() => resolvePublicInput({ agreementId: 11 })).toThrow()
    expect(() => resolvePublicInput({ attachmentIds: [4] })).toThrow()
  })
})
