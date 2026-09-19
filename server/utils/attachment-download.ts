import { send, setHeader, type H3Event } from 'h3'
export const sendAttachment = (event: H3Event, file: { filename: string; bytes: Uint8Array }) => {
  const encoded = encodeURIComponent(file.filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )
  setHeader(event, 'Content-Type', 'application/octet-stream')
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="download"; filename*=UTF-8''${encoded}`
  )
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Content-Security-Policy', 'sandbox')
  return send(event, Buffer.from(file.bytes))
}
