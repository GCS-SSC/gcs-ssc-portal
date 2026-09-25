import type { AgreementConfig, ResponseItem, SetInput, SetSnapshot } from '../schemas/agreements'
export interface FundingAgreement {
  id: string
  organizationId: string
  agencyId: string
  streamId: string
  nameEn: string
  nameFr: string
  agreementNumber: string
  config: AgreementConfig
  revision: number
  createdAt: string
}
export interface SubmissionSet extends SetInput {
  id: string
  revision: number
  published: boolean
  snapshot: SetSnapshot | null
  createdAt: string
}
export interface SetResponse {
  id: string
  setId: string
  setRevision: number
  organizationId: string
  revision: number
  status: 'draft' | 'submitted'
  locale: 'en' | 'fr'
  items: ResponseItem[]
  snapshot: SetSnapshot
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  submissionId: string | null
}
export interface LineBalance {
  budgetLineId: string
  foreignSystemId: string | null
  currency: string
  available: boolean
  budgetedAmount: string | null
  balance: string | null
  claimedAmount: string | null
  forecastAmount: string | null
  balanceAsOf: string | null
}
export interface BalanceWarning {
  kind: 'claim' | 'forecast'
  budgetLineId: string
  amount: string
  balance: string | null
  reason: string
}
export interface SubmissionCheck {
  balanceRevision: number | null
  balances: LineBalance[]
  warnings: BalanceWarning[]
}

export interface ResponseResult {
  attachments: ResponseAttachment[]
  attachmentLimits: AttachmentLimits
  response: SetResponse
  balances: LineBalance[]
  submittedBalances: LineBalance[] | null
}

export interface ResponseAttachment {
  status: 'pending' | 'ready'
  id: string
  itemId: string
  filename: string
  size: number
  sha256: string
  createdAt: string
}
export interface AttachmentLimits {
  configured: boolean
  maxBytes: number
  maxFilesPerForm: number
  maxResponseBytes: number
}
