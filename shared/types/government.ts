export interface BilingualName {
  nameEn: string
  nameFr: string
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
export interface IntegrationToken {
  id: string
  name: string
  agencyId: string
  expiresAt: string
  revoked: boolean
}
