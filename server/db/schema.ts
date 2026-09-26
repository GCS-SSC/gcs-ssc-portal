import type {
  AgreementConfig,
  AgreementStatus,
  SubmissionGcsStatus,
  SetItem,
  SetSnapshot,
  ResponseItem
} from '../../shared/schemas/agreements'
import type { SurveyDefinition } from '@gcs-ssc/survey'
import type { ColumnType, Generated } from 'kysely'
type Timestamp = ColumnType<Date, Date, Date>
interface ForeignIdentity {
  sourceSystem: Generated<string>
  foreignSystemId: Generated<string | null>
}
export interface Database {
  access_event: {
    id: string
    createdAt: Timestamp
    method: string
    path: string
    status: number
    durationMs: number
    actorKind: string
    actorId: number | null
    agencyId: number | null
    requestId: string
  }
  audit_event: {
    id: string
    createdAt: Timestamp
    operation: string
    resource: string
    path: string
    actorKind: string
    actorId: number | null
    agencyId: number | null
    requestId: string
  }
  administrator: {
    id: Generated<number>
    name: string
    email: string
    passwordHash: string
    active: boolean
    createdAt: Timestamp
  }
  administrator_session: {
    tokenHash: string
    administratorId: number
    expiresAt: Timestamp
    createdAt: Timestamp
  }
  administrator_login_attempt: { key: string; windowStart: Timestamp; count: number }
  user: {
    id: Generated<number>
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Timestamp
    updatedAt: Timestamp
  }
  session: {
    id: Generated<number>
    userId: number
    token: string
    expiresAt: Timestamp
    createdAt: Timestamp
    updatedAt: Timestamp
    ipAddress: string | null
    userAgent: string | null
  }
  account: {
    id: Generated<number>
    userId: number
    accountId: string
    providerId: string
    accessToken: string | null
    refreshToken: string | null
    idToken: string | null
    accessTokenExpiresAt: Timestamp | null
    refreshTokenExpiresAt: Timestamp | null
    scope: string | null
    password: string | null
    createdAt: Timestamp
    updatedAt: Timestamp
  }
  verification: {
    id: Generated<number>
    identifier: string
    value: string
    expiresAt: Timestamp
    createdAt: Timestamp
    updatedAt: Timestamp
  }
  organization: {
    id: Generated<number>
    name: string
    description: string
    active: Generated<boolean>
    verified: Generated<boolean>
    ownerId: number
    createdAt: Timestamp
  }
  membership: { organizationId: number; userId: number; joinedAt: Timestamp }
  permission: {
    organizationId: number
    userId: number
    permission: Exclude<import('../../shared/utils/permissions').OrganizationPermission, 'user'>
  }
  government_user: { userId: number; role: 'root' | 'staff'; active: boolean; createdAt: Timestamp }
  agency: ForeignIdentity & {
    id: Generated<number>
    nameEn: string
    nameFr: string
    createdAt: Timestamp
  }
  agency_staff: { agencyId: number; userId: number }
  program: ForeignIdentity & {
    id: Generated<number>
    agencyId: number
    nameEn: string
    nameFr: string
    createdAt: Timestamp
  }
  stream: ForeignIdentity & {
    id: Generated<number>
    programId: number
    agencyId: number
    nameEn: string
    nameFr: string
    createdAt: Timestamp
  }
  funding_call: ForeignIdentity & {
    revision: Generated<number>
    agencyId: number
    id: Generated<number>
    streamId: number
    nameEn: string
    nameFr: string
    startDate: ColumnType<string, string, string>
    startTime: ColumnType<string, string | undefined, string>
    endDate: ColumnType<string, string, string>
    endTime: ColumnType<string, string | undefined, string>
    published: boolean
    surveyId: Generated<number | null>
    surveyRevision: Generated<number | null>
    createdAt: Timestamp
  }
  survey: { id: Generated<number>; agencyId: number; revision: number; updatedAt: Timestamp }
  survey_revision: {
    surveyId: number
    revision: number
    definition: ColumnType<SurveyDefinition, SurveyDefinition, never>
    createdAt: Timestamp
  }
  funding_agreement: {
    id: Generated<number>
    organizationId: number
    agencyId: number
    streamId: number
    nameEn: string
    nameFr: string
    agreementNumber: string
    active: Generated<boolean>
    status: Generated<AgreementStatus | null>
    config: ColumnType<AgreementConfig, AgreementConfig, AgreementConfig>
    sourceSystem: string
    foreignSystemId: string | null
    revision: number
    createdAt: Timestamp
  }
  agreement_organization: {
    agreementId: number
    organizationId: number
    agencyId: number
    foreignApplicantRecipientId: string | null
  }
  organization_agency_identity: {
    agencyId: number
    organizationId: number
    foreignApplicantRecipientId: string
    verifiedAt: Timestamp
  }
  integration_delivery: {
    id: Generated<string>
    agencyId: number
    responseId: number
    kind: 'submission_item' | 'organization_detail'
    itemSubmissionId: string | null
    detailId: number | null
    createdAt: Timestamp
  }
  integration_consumption: {
    eventId: string
    remoteReference: string | null
    consumedAt: Timestamp
  }
  submission_item_outcome: {
    responseId: number
    itemSubmissionId: string
    remoteReference: string | null
    gcsStatus: AgreementStatus | null
    revision: number
    updatedAt: Timestamp
  }
  submission_set: {
    callId: Generated<number | null>
    id: Generated<number>
    organizationId: number
    agencyId: number
    agreementId: number | null
    nameEn: string
    nameFr: string
    sourceSystem: string
    foreignSystemId: string | null
    items: ColumnType<SetItem[], SetItem[], SetItem[]>
    snapshot: ColumnType<SetSnapshot | null, SetSnapshot | null, SetSnapshot | null>
    revision: number
    published: boolean
    createdAt: Timestamp
  }
  set_response: {
    id: Generated<number>
    setId: number
    organizationId: number
    setRevision: number
    snapshot: ColumnType<SetSnapshot, SetSnapshot, never>
    items: ColumnType<ResponseItem[], ResponseItem[], ResponseItem[]>
    forecastIterations: Generated<Record<string, number>>
    locale: 'en' | 'fr'
    revision: number
    status: 'draft' | 'submitted' | 'awaiting_documentation' | 'withdrawn'
    gcsStatus: Generated<SubmissionGcsStatus | null>
    createdBy: number
    updatedBy: number
    submittedBy: number | null
    resubmissionOfId: Generated<number | null>
    createdAt: Timestamp
    updatedAt: Timestamp
    submittedAt: ColumnType<Date | null, Date | null, Date | null>
    export: ColumnType<
      Record<string, unknown> | null,
      Record<string, unknown> | null,
      Record<string, unknown> | null
    >
  }
  submission_detail: {
    id: Generated<number>
    responseId: number
    body: string
    attachmentIds: ColumnType<number[], number[], number[]>
    createdBy: number | null
    senderAgencyId: number | null
    senderName: string
    createdAt: Timestamp
  }
  response_attachment: {
    id: Generated<number>
    responseId: number | null
    itemId: string
    filename: string
    size: number
    sha256: string
    bucket: string
    objectKey: string
    status: 'pending' | 'ready'
    createdBy: number | null
    senderAgencyId: number | null
    createdAt: Timestamp
  }
  government_invitation: {
    id: Generated<number>
    email: string
    name: string
    agencyId: number | null
    tokenHash: string
    status: 'pending' | 'accepted' | 'revoked'
    expiresAt: Timestamp
    createdAt: Timestamp
  }
  integration_token: {
    id: Generated<number>
    name: string
    agencyId: number
    tokenHash: string
    expiresAt: Timestamp
    revoked: boolean
    createdAt: Timestamp
  }
  invitation: {
    id: Generated<number>
    organizationId: number
    email: string
    name: string
    tokenHash: string
    status: 'pending' | 'accepted' | 'revoked'
    createdBy: number
    createdAt: Timestamp
    expiresAt: Timestamp
  }
}
