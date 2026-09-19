import type { CaseConfig, SetItem, SetSnapshot, ResponseItem } from '../../shared/schemas/cases'
import type { SurveyDefinition } from '@gcs-ssc/survey'
import type { ColumnType, Generated } from 'kysely'
type Timestamp = ColumnType<Date, Date, Date>
interface ForeignIdentity {
  sourceSystem: Generated<string>
  foreignSystemId: Generated<string | null>
}
export interface Database {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Timestamp
    updatedAt: Timestamp
  }
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Timestamp
    createdAt: Timestamp
    updatedAt: Timestamp
    ipAddress: string | null
    userAgent: string | null
  }
  account: {
    id: string
    userId: string
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
    id: string
    identifier: string
    value: string
    expiresAt: Timestamp
    createdAt: Timestamp
    updatedAt: Timestamp
  }
  organization: {
    id: string
    name: string
    description: string
    ownerId: string
    createdAt: Timestamp
  }
  membership: { organizationId: string; userId: string; joinedAt: Timestamp }
  permission: {
    organizationId: string
    userId: string
    permission: Exclude<import('../../shared/utils/permissions').OrganizationPermission, 'user'>
  }
  government_user: { userId: string; role: 'root' | 'staff'; active: boolean; createdAt: Timestamp }
  agency: ForeignIdentity & { id: string; nameEn: string; nameFr: string; createdAt: Timestamp }
  agency_staff: { agencyId: string; userId: string }
  program: ForeignIdentity & {
    id: string
    agencyId: string
    nameEn: string
    nameFr: string
    createdAt: Timestamp
  }
  stream: ForeignIdentity & {
    id: string
    programId: string
    agencyId: string
    nameEn: string
    nameFr: string
    createdAt: Timestamp
  }
  funding_call: ForeignIdentity & {
    revision: Generated<number>
    agencyId: string
    id: string
    streamId: string
    nameEn: string
    nameFr: string
    startDate: ColumnType<string, string, string>
    endDate: ColumnType<string, string, string>
    published: boolean
    surveyId: Generated<string | null>
    surveyRevision: Generated<number | null>
    createdAt: Timestamp
  }
  survey: { id: string; agencyId: string; revision: number; updatedAt: Timestamp }
  survey_revision: {
    surveyId: string
    revision: number
    definition: ColumnType<SurveyDefinition, SurveyDefinition, never>
    createdAt: Timestamp
  }
  funding_case: {
    id: string
    organizationId: string
    agencyId: string
    streamId: string
    nameEn: string
    nameFr: string
    agreementNumber: string
    config: ColumnType<CaseConfig, CaseConfig, CaseConfig>
    sourceSystem: string
    foreignSystemId: string | null
    revision: number
    createdAt: Timestamp
  }
  submission_set: {
    callId: Generated<string | null>
    id: string
    organizationId: string
    agencyId: string
    caseId: string | null
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
    id: string
    setId: string
    organizationId: string
    setRevision: number
    snapshot: ColumnType<SetSnapshot, SetSnapshot, never>
    items: ColumnType<ResponseItem[], ResponseItem[], ResponseItem[]>
    locale: 'en' | 'fr'
    revision: number
    status: 'draft' | 'submitted'
    createdBy: string
    updatedBy: string
    submittedBy: string | null
    createdAt: Timestamp
    updatedAt: Timestamp
    submittedAt: ColumnType<Date | null, Date | null, Date | null>
    submissionId: string | null
    export: ColumnType<
      Record<string, unknown> | null,
      Record<string, unknown> | null,
      Record<string, unknown> | null
    >
  }
  response_attachment: {
    id: string
    responseId: string | null
    itemId: string
    filename: string
    size: number
    sha256: string
    bucket: string
    objectKey: string
    status: 'pending' | 'ready'
    createdBy: string
    createdAt: Timestamp
  }
  government_invitation: {
    id: string
    email: string
    name: string
    agencyId: string | null
    tokenHash: string
    status: 'pending' | 'accepted' | 'revoked'
    expiresAt: Timestamp
    createdAt: Timestamp
  }
  integration_token: {
    id: string
    name: string
    agencyId: string
    tokenHash: string
    expiresAt: Timestamp
    revoked: boolean
    createdAt: Timestamp
  }
  invitation: {
    id: string
    organizationId: string
    email: string
    name: string
    tokenHash: string
    status: 'pending' | 'accepted' | 'revoked'
    createdBy: string
    createdAt: Timestamp
    expiresAt: Timestamp
  }
}
