import { defineEventHandler, setHeader } from 'h3'
import { handleAuthRequest } from '../../utils/auth'
import { toBoundedRequest } from '../../utils/request-body'
import { withSocketClientIp } from '../../utils/client-ip'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return handleAuthRequest(withSocketClientIp(event, toBoundedRequest(event)))
})
