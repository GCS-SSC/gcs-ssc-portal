export interface EvidenceBase {
  id: string
  createdAt: string
  path: string
  actorKind: string
  actorId: number | null
  agencyId: number | null
  requestId: string
}
export interface AuditEvidence extends EvidenceBase {
  operation: string
  resource: string
}
export interface AccessEvidence extends EvidenceBase {
  method: string
  status: number
  durationMs: number
}
export interface EvidenceList<T> {
  items: T[]
  total: number
  page: number
  limit: number
}
