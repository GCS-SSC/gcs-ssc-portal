import { casesEn, casesFr } from '~/locales/cases'
import type { Permission } from '~~/shared/types/api'
export const useCaseLocale = () => {
  const { locale, t } = useLocale(),
    apiMessage = useApiMessage()
  const c = (key: keyof typeof casesEn) => (locale.value === 'fr' ? casesFr : casesEn)[key]
  const permissionLabel = (permission: Permission) => {
    if (permission === 'user' || permission === 'admin') return t(permission)
    const [subject, level] = permission.split(':') as [keyof typeof casesEn, keyof typeof casesEn]
    return `${c(subject)} — ${c(level)}`
  }
  const errorMessage = (error: unknown) => {
    const failure = error as {
      data?: { data?: { code?: string }; code?: string }
      statusCode?: number
    }
    const code = failure.data?.data?.code ?? failure.data?.code ?? ''
    if (['REVISION_CONFLICT', 'BALANCE_CHANGED'].includes(code)) return c('conflict')
    if (code === 'SET_WITHDRAWN') return c('withdrawn')
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
