import { v7 as uuid } from 'uuid'
import type { ResponseItem, SetSnapshot } from '../../shared/schemas/agreements'
/** Frozen interchange. Foreign IDs refer to GCS stable budget lineage; no remote writes occur here. */
export const buildSubmissionExport = (options: {
  submissionId: string
  responseId: string
  setId: string
  setRevision: number
  organizationId: string
  locale: 'en' | 'fr'
  submittedAt: string
  snapshot: SetSnapshot
  items: ResponseItem[]
}) => ({
  schemaVersion: 1,
  submissionId: options.submissionId,
  responseId: options.responseId,
  setId: options.setId,
  setRevision: options.setRevision,
  organizationId: options.organizationId,
  locale: options.locale,
  submittedAt: options.submittedAt,
  sourceSystem: options.snapshot.sourceSystem,
  foreignSystemId: options.snapshot.foreignSystemId,
  application: options.snapshot.application ?? null,
  agreement: options.snapshot.agreement,
  agreementReference: options.snapshot.agreementReference,
  publicationId: options.snapshot.publicationId,
  items: options.items.map((item, position) => {
    const itemSubmissionId = uuid()
    const definition = options.snapshot.items.find((entry) => entry.item.id === item.id)!
    if (item.kind === 'survey')
      return {
        position,
        itemSubmissionId,
        ...item,
        survey: definition.item,
        definition: definition.survey
      }
    if (definition.item.kind === 'survey') throw new Error('Mismatched frozen response')
    const fiscalYearId = definition.item.fiscalYearId
    const config = options.snapshot.agreement!.config
    const fiscalYear = config.fiscalYears.find((year) => year.id === fiscalYearId)!
    const lines = item.lines.map((line) => {
      const budget = config.budgetLines.find((allowed) => allowed.id === line.budgetLineId)!
      return {
        ...line,
        foreignSystemId: budget.foreignSystemId,
        currency: budget.currency,
        budgetLine: budget
      }
    })
    const mappingComplete = Boolean(
      config.foreignSystemId &&
      config.externalStreamId &&
      fiscalYear.foreignSystemId &&
      lines.every((line) => line.foreignSystemId)
    )
    if (item.kind === 'claim')
      return {
        position,
        itemSubmissionId,
        ...item,
        lines,
        mappingComplete,
        claim: {
          agreementId: config.foreignSystemId,
          streamId: config.externalStreamId,
          fiscalYearId: fiscalYear.foreignSystemId,
          isFinalForYear: item.isFinalForYear,
          periodStart: item.periodStart,
          periodEnd: item.periodEnd,
          receivedDate: options.submittedAt,
          submissionUuid: itemSubmissionId,
          lineItems: lines.map((line) => ({
            budgetLineItemId: line.foreignSystemId,
            submittedCostCategory: line.budgetLine.costCategory,
            submittedCostSubsection: line.budgetLine.costSubsection,
            submittedLineItem:
              options.locale === 'en' ? line.budgetLine.nameEn : line.budgetLine.nameFr,
            description: 'description' in line ? line.description : '',
            amount: line.amount,
            currency: line.currency
          }))
        }
      }
    return {
      position,
      itemSubmissionId,
      ...item,
      lines,
      mappingComplete,
      forecast: {
        agreementId: config.foreignSystemId,
        header: { egcs_fc_fiscalyear: fiscalYear.foreignSystemId },
        lineItems: lines.map((line) => ({
          egcs_fc_fundingagreementbudgetlineitem: line.foreignSystemId,
          egcs_fc_month: 'month' in line ? line.month : 0,
          egcs_fc_amount: line.amount,
          egcs_fc_currency: line.currency,
          egcs_fc_version: '0'
        }))
      }
    }
  })
})
