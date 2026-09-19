import type { H3Event } from 'h3'
export const INTERNAL_IP_HEADER = 'x-portal-client-ip'
/** Only the transport peer is trusted; browser-supplied forwarding headers are not. */
export const withSocketClientIp = (event: H3Event, request: Request): Request => {
  const headers = new Headers(request.headers)
  headers.delete(INTERNAL_IP_HEADER)
  const address = event.node.req.socket?.remoteAddress
  if (address) headers.set(INTERNAL_IP_HEADER, address)
  return new Request(request, { headers })
}
