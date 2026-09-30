import { describe, expect, it } from 'vitest'
import { applicationStreamReference } from '../../shared/utils/application-source'

describe('funding application stream source identity', () => {
  it.each([
    ['gcs-ssc-opportunity', 'gcs-ssc', '301'],
    ['gcs-ssc', 'gcs-ssc', '301'],
    ['another-source', 'another-source', '301'],
    ['gcs-ssc-opportunity', 'another-source', null],
    ['another-source', 'gcs-ssc', null],
    ['gcs-ssc-opportunity-shim', 'gcs-ssc', null],
    ['gcs-ssc-opportunity', 'gcs-ssc-other', null],
    ['gcs-ssc-intake', 'gcs-ssc', null]
  ])(
    'call %s and stream %s resolve only established source relationships',
    (callSource, streamSource, expected) => {
      expect(
        applicationStreamReference(callSource!, {
          sourceSystem: streamSource!,
          foreignSystemId: '301'
        })
      ).toBe(expected)
    }
  )
  it('preserves absent foreign stream identity', () => {
    expect(
      applicationStreamReference('gcs-ssc-opportunity', {
        sourceSystem: 'gcs-ssc',
        foreignSystemId: null
      })
    ).toBeNull()
  })
})
