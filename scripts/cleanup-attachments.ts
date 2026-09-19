import { useDatabase, closeDatabase } from '../server/utils/database'
import { cleanupAttachments } from '../server/utils/attachments'
try {
  console.log(await cleanupAttachments(await useDatabase()))
} finally {
  await closeDatabase()
}
