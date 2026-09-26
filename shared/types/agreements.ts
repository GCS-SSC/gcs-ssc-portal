import type {
  AgreementConfig,
  AgreementStatus,
  ResponseItem,
  SetInput,
  SetSnapshot
} from '../schemas/agreements'
import type { ResponseCodes } from '../utils/response-code'
export interface FundingAgreement {
  id: string
  organizationId: string
  agencyId: string
  streamId: string
  nameEn: string
  nameFr: string
  agreementNumber: string
  active: boolean
  status: AgreementStatus | null
  config: AgreementConfig
  revision: number
  createdAt: string
}
export interface OrganizationAgreementSummary extends Pick<
  FundingAgreement,
  'id' | 'nameEn' | 'nameFr' | 'agreementNumber' | 'streamId' | 'active' | 'status'
> {
  agencyNameEn: string
  agencyNameFr: string
}
export interface SubmissionSet extends Omit<SetInput, 'organizationId' | 'agencyId' | 'agreementId'> {
  id: string
  organizationId: string
  agencyId: string
  agreementId: string | null
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
  status: 'draft' | 'submitted' | 'awaiting_documentation'
  gcsStatus: AgreementStatus | null
  locale: 'en' | 'fr'
  items: ResponseItem[]
  forecastIterations: Record<string, number>
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
  details: SubmissionDetail[]
}

export interface SubmissionDetail {
  id: string
  body: string
  attachmentIds: string[]
  createdAt: string
}

export interface ResponseSummary {
  id: string
  codes: ResponseCodes
  setId: string
  agreementId: string | null
  callId: string | null
  nameEn: string
  nameFr: string
  kinds: Array<'claim' | 'forecast' | 'survey'>
  claimPeriodStart: number | null
  claimPeriodEnd: number | null
  finalClaim: boolean | null
  forecastFiscalYear: number | null
  forecastIteration: number | null
  status: SetResponse['status']
  gcsStatus: AgreementStatus | null
  submittedAt: string | null
  updatedAt: string
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
