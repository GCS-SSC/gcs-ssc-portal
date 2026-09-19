import { createError, getRequestURL } from 'h3'
export const MAX_BODY_BYTES = 16 * 1024
const oversized = () =>
  createError({
    statusCode: 413,
    message: 'REQUEST_TOO_LARGE',
    data: { code: 'REQUEST_TOO_LARGE' }
  })
/** Count actual streamed bytes; Content-Length is only an early rejection hint. */
export const readBoundedBody = async (
  request: Request,
  maxBytes = MAX_BODY_BYTES
): Promise<Uint8Array | undefined> => {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) {
    void request.body?.cancel().catch(() => undefined)
    throw oversized()
  }
  if (!request.body) return undefined
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        // Cancel without waiting for the peer to close an unbounded upload.
        void reader.cancel().catch(() => undefined)
        throw oversized()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}
export const parseJsonBody = (body: Uint8Array | undefined): unknown => {
  if (!body?.byteLength) return undefined
  try {
    return JSON.parse(new TextDecoder().decode(body))
  } catch {
    throw createError({
      statusCode: 400,
      message: 'INVALID_INPUT',
      data: { code: 'INVALID_INPUT' }
    })
  }
}

/** H3 1's web stream adapter lacks cancellation; stop reading safely on overflow. */
export const toBoundedRequest = (event: import('h3').H3Event): Request => {
  if (event.web?.request) return event.web.request
  const incoming = event.node.req
  const hasBody = !['GET', 'HEAD'].includes(event.method)
  let stopped = false
  const stream = hasBody
    ? new ReadableStream<Uint8Array>({
        start(controller) {
          incoming.on('data', (chunk) => {
            if (!stopped) controller.enqueue(chunk)
          })
          incoming.on('end', () => {
            if (!stopped) {
              stopped = true
              controller.close()
            }
          })
          incoming.on('error', (error) => {
            if (!stopped) {
              stopped = true
              controller.error(error)
            }
          })
        },
        cancel() {
          stopped = true
          incoming.pause()
          // Let the 413 response finish, then close rather than reuse an undrained socket.
          event.node.res.setHeader('Connection', 'close')
        }
      })
    : undefined
  return new Request(getRequestURL(event), {
    method: event.method,
    headers: event.headers,
    body: stream,
    duplex: 'half'
  } as RequestInit)
}
