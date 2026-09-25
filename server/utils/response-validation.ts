import { validateSurveyAnswers, answersSchema } from '@gcs-ssc/survey'
import { money, type ResponseItem, type SetSnapshot } from '../../shared/schemas/agreements'
import { governmentFail as fail } from './government-access'
/** Both drafts and submissions are checked against the exact published configuration. */
export const validateResponseItems = (
  snapshot: SetSnapshot,
  items: ResponseItem[],
  mode: 'draft' | 'submit'
) => {
  if (
    items.length !== snapshot.items.length ||
    new Set(items.map((item) => item.id)).size !== items.length
  )
    return fail(400, 'RESPONSE_INVALID')
  return snapshot.items.map((published) => {
    const item = items.find((candidate) => candidate.id === published.item.id)
    if (!item || item.kind !== published.item.kind) return fail(400, 'RESPONSE_INVALID')
    if (item.kind === 'survey') {
      if (!published.survey) return fail(400, 'RESPONSE_INVALID')
      const result = validateSurveyAnswers(
        published.survey,
        answersSchema.parse(item.answers),
        mode
      )
      if (Object.keys(result.errors).length) return fail(400, 'RESPONSE_INVALID')
      return { ...item, answers: result.answers }
    }
    if (published.item.kind === 'survey') return fail(400, 'RESPONSE_INVALID')
    const fiscalYearId = published.item.fiscalYearId
    const budget =
      snapshot.agreement?.config.budgetLines.filter((line) => line.fiscalYearId === fiscalYearId) ??
      []
    const expectedCount = budget.length * (item.kind === 'forecast' ? 12 : 1)
    if (item.lines.length !== expectedCount) return fail(400, 'RESPONSE_INVALID')
    const keys = item.lines.map(
      (line) => `${line.budgetLineId}:${'month' in line ? line.month : ''}`
    )
    if (
      new Set(keys).size !== keys.length ||
      item.lines.some((line) => !budget.some((allowed) => allowed.id === line.budgetLineId))
    )
      return fail(400, 'RESPONSE_INVALID')
    if (item.kind === 'claim' && item.periodEnd < item.periodStart)
      return fail(400, 'RESPONSE_INVALID')
    const lines = item.lines.map((line) => {
      if (mode === 'submit' && 'description' in line && !line.description.trim())
        return fail(400, 'RESPONSE_INVALID')
      return {
        ...line,
        amount: mode === 'draft' && line.amount === '' ? '' : money.parse(line.amount)
      }
    })
    return { ...item, lines } as ResponseItem
  })
}
export const initialResponseItems = (snapshot: SetSnapshot, locale: 'en' | 'fr'): ResponseItem[] =>
  snapshot.items.map(({ item }) => {
    if (item.kind === 'survey') return { id: item.id, kind: 'survey', answers: {} }
    const budget = snapshot.agreement!.config.budgetLines.filter(
      (line) => line.fiscalYearId === item.fiscalYearId
    )
    if (item.kind === 'claim')
      return {
        id: item.id,
        kind: 'claim',
        isFinalForYear: false,
        periodStart: 0,
        periodEnd: 11,
        lines: budget.map((line) => ({
          budgetLineId: line.id,
          description: locale === 'en' ? line.nameEn : line.nameFr,
          amount: ''
        }))
      }
    return {
      id: item.id,
      kind: 'forecast',
      lines: budget.flatMap((line) =>
        Array.from({ length: 12 }, (_, month) => ({ budgetLineId: line.id, month, amount: '' }))
      )
    }
  })
