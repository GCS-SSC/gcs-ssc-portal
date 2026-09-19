import { surveyEn, surveyFr } from '~/locales/survey'
import type { SurveyError } from '@gcs-ssc/survey'
export const useSurveyLocale = () => {
  const { locale } = useLocale()
  const s = (key: keyof typeof surveyEn) => (locale.value === 'fr' ? surveyFr : surveyEn)[key]
  const keys = {
    required: 'errorRequired',
    email: 'errorEmail',
    number: 'errorNumber',
    date: 'errorDate',
    choice: 'errorChoice',
    length: 'errorLength',
    unknown: 'errorUnknown'
  } as const
  return { s, surveyError: (code?: SurveyError) => (code ? s(keys[code]) : '') }
}
