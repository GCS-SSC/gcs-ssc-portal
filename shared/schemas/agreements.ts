import { z } from 'zod'
import { answersSchema, attachmentPolicySchema, type SurveyDefinition } from '@gcs-ssc/survey'
import { bilingualName } from './government'
import { currencyCodes } from '../utils/currencies'
import type { PermissionSubject } from '../utils/permissions'
import { externalId } from './external'
export { externalId } from './external'
const key = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/)
const databaseId = z.number().int().positive()
export const documentationAttachmentItemId = '!documentation'
export const money = z
  .string()
  .regex(/^-?(?:0|[1-9]\d{0,16})(?:\.\d{1,2})?$/)
  .transform((value) => {
    const negative = value.startsWith('-'),
      [whole, fraction = ''] = value.replace('-', '').split('.')
    const zero = BigInt(whole! + fraction.padEnd(2, '0')) === BigInt('0')
    return `${negative && !zero ? '-' : ''}${whole}.${fraction.padEnd(2, '0')}`
  })
export const fiscalYearSchema = z
  .object({
    id: key,
    startYear: z.number().int().min(1900).max(9998),
    foreignSystemId: externalId.nullable().default(null)
  })
  .strict()
export const budgetLineSchema = bilingualName.extend({
  id: key,
  fiscalYearId: key,
  foreignSystemId: externalId.nullable().default(null),
  costCategory: z.string().trim().min(1).max(200),
  costSubsection: z.string().trim().min(1).max(255),
  budgetedAmount: money,
  balance: money.nullable().default(null),
  claimedAmount: money.nullable().default(null),
  forecastAmount: money.nullable().default(null),
  balanceAsOf: z.iso.datetime().nullable().default(null),
  currency: z.enum(currencyCodes)
})
export const agreementConfigSchema = z
  .object({
    sourceSystem: z.string().trim().min(1).max(100).default('gcs-ssc'),
    foreignSystemId: externalId.nullable().default(null),
    externalStreamId: externalId.nullable().default(null),
    externalApplicantRecipientId: externalId.nullable().default(null),
    claimInstruction: z
      .object({ en: z.string().trim().min(1).max(4000), fr: z.string().trim().min(1).max(4000) })
      .strict()
      .nullable()
      .default(null),
    forecastInstruction: z
      .object({ en: z.string().trim().min(1).max(4000), fr: z.string().trim().min(1).max(4000) })
      .strict()
      .nullable()
      .default(null),
    fiscalYears: z.array(fiscalYearSchema).max(20),
    budgetLines: z.array(budgetLineSchema).max(200)
  })
  .strict()
  .superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (
      new Set(value.fiscalYears.map((year) => year.id)).size !== value.fiscalYears.length ||
      new Set(value.budgetLines.map((line) => line.id)).size !== value.budgetLines.length
    )
      fail('Duplicate local identifiers')
    for (const values of [
      value.fiscalYears.map((year) => year.foreignSystemId),
      value.budgetLines.map((line) => line.foreignSystemId)
    ]) {
      const nonnull = values.filter(Boolean)
      if (new Set(nonnull).size !== nonnull.length) fail('Duplicate external identifiers')
    }
    if (new Set(value.fiscalYears.map((year) => year.startYear)).size !== value.fiscalYears.length)
      fail('Duplicate fiscal year')
    for (const line of value.budgetLines)
      if (
        (line.balance !== null || line.claimedAmount !== null || line.forecastAmount !== null) &&
        !line.balanceAsOf
      )
        fail('Balance timestamp is required')
    for (const line of value.budgetLines)
      if (!value.fiscalYears.some((year) => year.id === line.fiscalYearId))
        fail('Budget line requires an available fiscal year')
  })
export const agreementStatusSchema = z
  .object({
    en: z.string().trim().min(1).max(120),
    fr: z.string().trim().min(1).max(120),
    colour: z.string().regex(/^#[0-9a-fA-F]{6}$/)
  })
  .strict()
export type AgreementStatus = z.infer<typeof agreementStatusSchema>
export const submissionGcsStatusSchema = agreementStatusSchema
  .extend({
    isWithdrawable: z.boolean()
  })
  .strict()
export type SubmissionGcsStatus = z.infer<typeof submissionGcsStatusSchema>
export const agreementInput = bilingualName.extend({
  organizationId: databaseId,
  streamId: databaseId,
  agreementNumber: z.string().trim().min(1).max(15),
  active: z.boolean().optional(),
  status: agreementStatusSchema.nullable().optional(),
  config: agreementConfigSchema
})
export const agreementUpdateInput = z
  .object({ expectedRevision: z.number().int().positive(), value: agreementInput })
  .strict()
const financialItem = z
  .object({ id: key, fiscalYearId: key, attachments: attachmentPolicySchema.optional() })
  .strict()
export const setItemSchema = z.discriminatedUnion('kind', [
  z
    .object({
      id: key,
      kind: z.literal('survey'),
      surveyId: databaseId,
      surveyRevision: z.number().int().positive()
    })
    .strict(),
  financialItem.extend({ kind: z.literal('claim') }),
  financialItem.extend({ kind: z.literal('forecast') })
])
export const setInput = bilingualName
  .extend({
    organizationId: databaseId,
    agencyId: databaseId,
    agreementId: databaseId.nullable(),
    sourceSystem: z.string().trim().min(1).max(100).default('gcs-ssc'),
    foreignSystemId: externalId.nullable().default(null),
    items: z
      .array(setItemSchema)
      .min(1)
      .max(10)
      .refine((items) => new Set(items.map((item) => item.id)).size === items.length)
  })
  .superRefine((value, ctx) => {
    if (!value.agreementId && value.items.some((item) => item.kind !== 'survey'))
      ctx.addIssue({ code: 'custom', message: 'Organization sets may only contain designed forms' })
    if (
      value.items.some((item) => item.kind === 'claim') &&
      value.items.some((item) => item.kind === 'forecast')
    )
      ctx.addIssue({ code: 'custom', message: 'Claims and forecasts require separate sets' })
  })
export const setUpdateInput = z
  .object({ expectedRevision: z.number().int().positive(), value: setInput })
  .strict()
export const versionInput = z.object({ expectedRevision: z.number().int().positive() }).strict()
export const submissionStatusInput = z.discriminatedUnion('status', [
  z
    .object({
      expectedRevision: z.number().int().positive(),
      status: z.literal('submitted'),
      gcsStatus: submissionGcsStatusSchema.nullable()
    })
    .strict(),
  z
    .object({
      expectedRevision: z.number().int().positive(),
      status: z.literal('awaiting_documentation'),
      gcsStatus: submissionGcsStatusSchema.nullable(),
      message: z.string().trim().min(1).max(4000),
      senderName: z.string().trim().min(1).max(120)
    })
    .strict()
])
export const submissionDetailInput = z
  .object({
    expectedRevision: z.number().int().positive(),
    body: z.string().trim().max(4000),
    attachmentIds: z.array(databaseId).max(10)
  })
  .strict()
  .refine((value) => value.body.length > 0 || value.attachmentIds.length > 0)
export const governmentDetailInput = z
  .object({
    expectedRevision: z.number().int().positive(),
    body: z.string().trim().min(1).max(4000),
    senderName: z.string().trim().min(1).max(120),
    attachmentIds: z.array(databaseId).max(10)
  })
  .strict()
const month = z.number().int().min(0).max(11)
export const responseItemSchema = z.discriminatedUnion('kind', [
  z.object({ id: key, kind: z.literal('survey'), answers: answersSchema }).strict(),
  z
    .object({
      id: key,
      kind: z.literal('claim'),
      isFinalForYear: z.boolean(),
      periodStart: month,
      periodEnd: month,
      lines: z
        .array(
          z
            .object({
              budgetLineId: key,
              description: z.string().trim().max(2000),
              amount: z.string().max(21)
            })
            .strict()
        )
        .max(200)
    })
    .strict(),
  z
    .object({
      id: key,
      kind: z.literal('forecast'),
      lines: z
        .array(z.object({ budgetLineId: key, month, amount: z.string().max(21) }).strict())
        .max(2400)
    })
    .strict()
])
export const responseInput = z
  .object({
    expectedRevision: z.number().int().positive(),
    items: z.array(responseItemSchema).max(10)
  })
  .strict()
export const startResponseInput = z.object({ locale: z.enum(['en', 'fr']) }).strict()
export type AgreementConfig = z.infer<typeof agreementConfigSchema>
export type AgreementInput = z.infer<typeof agreementInput>
export type SetInput = z.infer<typeof setInput>
export type SetItem = z.infer<typeof setItemSchema>
export type ResponseItem = z.infer<typeof responseItemSchema>
export interface PublishedItem {
  item: SetItem
  survey?: SurveyDefinition
}
export interface SetSnapshot {
  application?: {
    callId: number
    callRevision: number
    agencyId: number
    programId: number
    streamId: number
    startDate: string
    startTime?: string
    endDate: string
    endTime?: string
    sourceSystem: string
    foreignSystemId: string | null
    externalStreamId: string | null
  }
  schemaVersion: 1
  publicationId: string
  agreementReference: {
    id: number
    agreementNumber: string
    sourceSystem: string
    foreignSystemId: string | null
    externalStreamId: string | null
    externalApplicantRecipientId: string | null
  } | null
  nameEn: string
  nameFr: string
  items: PublishedItem[]
  agreement: {
    id: number
    revision: number
    agreementNumber: string
    config: AgreementConfig
  } | null
  sourceSystem: string
  foreignSystemId: string | null
}
export const setSubjects = (items: readonly SetItem[]): PermissionSubject[] => {
  const financial = [
    ...new Set(items.filter((item) => item.kind !== 'survey').map((item) => item.kind))
  ]
  return financial.length ? financial : ['form']
}

export const balancesInput = z
  .object({
    expectedRevision: z.number().int().positive(),
    asOf: z.iso.datetime(),
    lines: z
      .array(
        z
          .object({
            foreignSystemId: externalId,
            budgetedAmount: money,
            balance: money,
            claimedAmount: money.nullable().default(null),
            forecastAmount: money.nullable().default(null)
          })
          .strict()
      )
      .min(1)
      .max(200)
      .refine((lines) => new Set(lines.map((line) => line.foreignSystemId)).size === lines.length)
  })
  .strict()
export const submitResponseInput = versionInput.extend({
  balanceRevision: z.number().int().positive().nullable(),
  warningsAcknowledged: z.boolean()
})

export const responseSubjects = (snapshot: SetSnapshot): PermissionSubject[] =>
  snapshot.application ? ['application'] : setSubjects(snapshot.items.map((entry) => entry.item))
export const attachmentsAllowed = (entry: PublishedItem) =>
  (entry.item.kind === 'survey'
    ? entry.survey?.attachments?.enabled
    : entry.item.attachments?.enabled) === true
