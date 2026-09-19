export const subjects = ['application', 'claim', 'forecast', 'form'] as const
export const accessLevels = ['viewer', 'contributor', 'manager'] as const
export type PermissionSubject = (typeof subjects)[number]
export type AccessLevel = (typeof accessLevels)[number]
export type OrganizationPermission = 'user' | 'admin' | `${PermissionSubject}:${AccessLevel}`
export const permissionLevel = (
  permissions: readonly string[],
  subject: PermissionSubject
): AccessLevel | '' =>
  [...accessLevels].reverse().find((level) => permissions.includes(`${subject}:${level}`)) ?? ''
export const hasAccess = (
  permissions: readonly string[],
  subject: PermissionSubject,
  level: AccessLevel = 'viewer'
) =>
  accessLevels.indexOf(permissionLevel(permissions, subject) as AccessLevel) >=
  accessLevels.indexOf(level)
