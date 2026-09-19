import { attachmentsEn, attachmentsFr } from '~/locales/attachments'
export const useAttachmentLocale = () => {
  const { locale } = useLocale()
  return {
    a: (key: keyof typeof attachmentsEn) =>
      (locale.value === 'fr' ? attachmentsFr : attachmentsEn)[key]
  }
}
