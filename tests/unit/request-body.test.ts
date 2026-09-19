import { describe, expect, it } from 'vitest'
import { MAX_BODY_BYTES, parseJsonBody, readBoundedBody } from '../../server/utils/request-body'
const streamed = (chunks: number[], headers: Record<string, string> = {}) => {
  let cancelled = false
  const body = new ReadableStream({
    pull(controller) {
      const size = chunks.shift()
      if (size === undefined) controller.close()
      else controller.enqueue(new Uint8Array(size))
    },
    cancel() {
      cancelled = true
    }
  })
  const request = new Request('http://localhost:3000/api/organizations', {
    method: 'POST',
    headers,
    body,
    duplex: 'half'
  } as RequestInit)
  return { request, isCancelled: () => cancelled }
}
describe('streamed request limit', () => {
  it('bounds uploads without Content-Length and cancels oversized streams', async () => {
    const input = streamed([8192, 8192, 1, 99999])
    await expect(readBoundedBody(input.request)).rejects.toMatchObject({ statusCode: 413 })
    expect(input.isCancelled()).toBe(true)
  })
  it('ignores understated Content-Length for size enforcement', async () => {
    await expect(
      readBoundedBody(streamed([MAX_BODY_BYTES, 1], { 'content-length': '1' }).request)
    ).rejects.toMatchObject({ statusCode: 413 })
  })
  it('accepts exactly the limit and parses valid JSON', async () => {
    expect((await readBoundedBody(streamed([MAX_BODY_BYTES]).request))?.byteLength).toBe(
      MAX_BODY_BYTES
    )
    expect(
      parseJsonBody(
        await readBoundedBody(
          new Request('http://localhost', { method: 'POST', body: '{"name":"Example"}' })
        )
      )
    ).toEqual({ name: 'Example' })
    expect(() => parseJsonBody(new TextEncoder().encode('{broken'))).toThrow()
  })
})
