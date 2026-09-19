import { en, fr, type MessageKey } from '~/locales/messages'
export const useLocale = () => {
  const locale = useCookie<'en' | 'fr'>('portal-locale', {
    default: () => 'en',
    sameSite: 'lax'
  })
  if (locale.value !== 'en' && locale.value !== 'fr') locale.value = 'en'
  const t = (key: MessageKey, params: Record<string, string | number> = {}) => {
    const message: string = (locale.value === 'fr' ? fr : en)[key]
    return message.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match))
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale.value === 'fr' ? 'fr-CA' : 'en-CA', {
      dateStyle: 'long'
    }).format(new Date(value))
  return { locale, t, date }
}
