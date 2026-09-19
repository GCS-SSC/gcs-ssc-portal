import type { OrganizationPermission } from '../utils/permissions'
export type Permission = OrganizationPermission
export interface PortalUser {
  id: string
  name: string
  email: string
}
export interface Organization {
  id: string
  name: string
  description: string
  ownerId: string
  permissions: Permission[]
  memberCount: number
  createdAt: string
}
export interface Member {
  userId: string
  name: string
  email: string
  permissions: Permission[]
  isOwner: boolean
  joinedAt: string
}
export interface Invitation {
  id: string
  email: string
  name: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  createdAt: string
  expiresAt: string
}
export interface InvitationPreview {
  organizationName: string
  email: string
  name: string
  expiresAt: string
}
