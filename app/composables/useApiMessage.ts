export const useApiMessage = () => {
  const { t } = useLocale()
  return (error: unknown) => {
    const failure = error as {
      status?: number
      statusCode?: number
      data?: { code?: string; data?: { code?: string }; statusCode?: number }
    }
    const status = failure?.status ?? failure?.statusCode ?? failure?.data?.statusCode
    const code = failure?.data?.code ?? failure?.data?.data?.code ?? ''
    if (code.includes('USER_ALREADY_EXISTS')) return t('emailExists')
    if (code.includes('INVALID_EMAIL_OR_PASSWORD')) return t('authError')
    if (status === 401) return t('sessionExpired')
    if (status === 403) return t('notAuthorized')
    if (status === 404) return t('notFound')
    if (status === 409) return t('conflict')
    if (status === 429) return t('tooMany')
    if (status === 400 || status === 422) return t('invalidInput')
    return t('genericError')
  }
}
