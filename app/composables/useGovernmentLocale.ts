import { governmentEn, governmentFr } from '~/locales/government'
export const useGovernmentLocale = () => {
  const { locale } = useLocale()
  return {
    g: (key: keyof typeof governmentEn) =>
      (locale.value === 'fr' ? governmentFr : governmentEn)[key],
    localized: (value: { nameEn: string; nameFr: string }) =>
      locale.value === 'fr' ? value.nameFr : value.nameEn
  }
}
