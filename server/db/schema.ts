import type { SurveyDefinition } from '@gcs-ssc/survey'
import type { ColumnType, Generated } from 'kysely'
type Timestamp = ColumnType<Date, Date, Date>
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
  permission: { organizationId: string; userId: string; permission: 'admin' | 'application' }
  government_user: { userId: string; role: 'root' | 'staff'; active: boolean; createdAt: Timestamp }
  agency: { id: string; nameEn: string; nameFr: string; createdAt: Timestamp }
  agency_staff: { agencyId: string; userId: string }
  program: { id: string; agencyId: string; nameEn: string; nameFr: string; createdAt: Timestamp }
  stream: { id: string; programId: string; nameEn: string; nameFr: string; createdAt: Timestamp }
  funding_call: {
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
