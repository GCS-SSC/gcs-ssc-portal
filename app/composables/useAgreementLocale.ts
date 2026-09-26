import { agreementsEn, agreementsFr } from '~/locales/agreements'
import type { Permission } from '~~/shared/types/api'
export const useAgreementLocale = () => {
  const { a } = useAttachmentLocale()
  const { locale, t } = useLocale(),
    apiMessage = useApiMessage()
  const c = (key: keyof typeof agreementsEn) =>
    (locale.value === 'fr' ? agreementsFr : agreementsEn)[key]
  const permissionLabel = (permission: Permission) => {
    if (permission === 'user' || permission === 'admin') return t(permission)
    const [subject, level] = permission.split(':') as [
      keyof typeof agreementsEn,
      keyof typeof agreementsEn
    ]
    return `${c(subject)} — ${c(level)}`
  }
  const errorMessage = (error: unknown) => {
    const failure = error as {
      data?: { data?: { code?: string }; code?: string }
      statusCode?: number
    }
    const code = failure.data?.data?.code ?? failure.data?.code ?? ''
    if (code === 'CALL_NOT_OPEN') return a('closed')
    if (code === 'ATTACHMENT_TOO_LARGE') return a('tooLarge')
    if (code === 'ATTACHMENT_LIMIT') return a('capacity')
    if (code === 'ATTACHMENTS_NOT_ALLOWED') return a('notAllowed')
    if (code === 'ATTACHMENTS_PENDING') return a('pendingError')
    if (code === 'ATTACHMENT_STORAGE_UNAVAILABLE') return a('unavailable')
    if (code === 'ATTACHMENT_STORAGE_ERROR') return a('storageError')
    if (['REVISION_CONFLICT', 'BALANCE_CHANGED'].includes(code)) return c('conflict')
    if (code === 'SET_WITHDRAWN') return c('withdrawn')
    if (code === 'RESPONSE_NOT_WITHDRAWABLE') return c('withdrawalUnavailable')
    if (code === 'FORM_SHAPE_CHANGED') return c('reopenUnavailable')
    if (code === 'DRAFT_EXISTS') return c('draftAlreadyExists')
    if (failure.statusCode === 403) return c('noAccess')
    if (failure.statusCode === 400 || ['RESPONSE_INVALID', 'BUDGET_REQUIRED'].includes(code))
      return c('invalid')
    return apiMessage(error)
  }
  const monthKeys = [
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
    'january',
    'february',
    'march'
  ] as const
  return {
    c,
    permissionLabel,
    errorMessage,
    months: computed(() => monthKeys.map((key, index) => ({ value: String(index), label: c(key) })))
  }
}
