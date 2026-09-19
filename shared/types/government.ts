export interface BilingualName {
  nameEn: string
  nameFr: string
}
export interface GovernmentAccess {
  role: 'root' | 'staff'
  agencyIds: string[]
}
export interface Agency extends BilingualName {
  id: string
  createdAt: string
}
export interface Program extends BilingualName {
  id: string
  agencyId: string
  createdAt: string
}
export interface Stream extends BilingualName {
  id: string
  programId: string
  agencyId: string
  createdAt: string
}
export interface FundingCall extends BilingualName {
  id: string
  streamId: string
  programId: string
  agencyId: string
  agencyNameEn: string
  agencyNameFr: string
  programNameEn: string
  programNameFr: string
  streamNameEn: string
  streamNameFr: string
  startDate: string
  endDate: string
  surveyId: string | null
  surveyRevision: number | null
  published: boolean
  createdAt: string
}
export interface GovernmentStaff {
  userId: string
  name: string
  email: string
  role: 'root' | 'staff'
  active: boolean
  agencyIds: string[]
}
export interface StaffInvitation {
  id: string
  email: string
  name: string
  agencyId: string | null
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expiresAt: string
}
export interface IntegrationToken {
  id: string
  name: string
  agencyId: string
  expiresAt: string
  revoked: boolean
}
