const limit = (name: string, fallback: number, maximum: number) => {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  return value
}
export const attachmentConfig = () => ({
  configured: true,
  maxBytes: limit('ATTACHMENT_MAX_BYTES', 10 * 1024 * 1024, 25 * 1024 * 1024),
  maxFilesPerForm: limit('ATTACHMENT_MAX_FILES_PER_FORM', 10, 20),
  maxResponseBytes: limit('ATTACHMENT_MAX_RESPONSE_BYTES', 50 * 1024 * 1024, 250 * 1024 * 1024)
})
