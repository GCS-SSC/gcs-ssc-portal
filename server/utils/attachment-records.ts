import type { GovernmentDb } from './government-access'
export const attachmentMetadata = async (db: GovernmentDb, responseId: number) =>
  (
    await db
      .selectFrom('response_attachment')
      .select(['id', 'status', 'itemId', 'filename', 'size', 'sha256', 'createdAt'])
      .where('responseId', '=', responseId)
      .orderBy('createdAt')
      .orderBy('id')
      .execute()
  ).map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString() }))
