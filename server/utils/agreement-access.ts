import type { AccessLevel, PermissionSubject } from '../../shared/utils/permissions'
import { hasAccess } from '../../shared/utils/permissions'
import { getPermissions } from './portal'
import { governmentFail as fail, type GovernmentDb } from './government-access'
export const lockOrganization = async (db: GovernmentDb, id: string) => {
  const org = await db
    .selectFrom('organization')
    .select('id')
    .where('id', '=', id)
    .forUpdate()
    .executeTakeFirst()
  if (!org) fail(404, 'ORGANIZATION_NOT_FOUND')
}
export const requireBusinessAccess = async (
  db: GovernmentDb,
  organizationId: string,
  userId: string,
  subjects: PermissionSubject[],
  level: AccessLevel
) => {
  if (
    !(await db
      .selectFrom('membership')
      .select('userId')
      .where('organizationId', '=', organizationId)
      .where('userId', '=', userId)
      .executeTakeFirst())
  )
    fail(404, 'ORGANIZATION_NOT_FOUND')
  const permissions = await getPermissions(db, organizationId, userId)
  if (!subjects.every((subject) => hasAccess(permissions, subject, level)))
    fail(403, 'BUSINESS_PERMISSION_REQUIRED')
  return permissions
}
