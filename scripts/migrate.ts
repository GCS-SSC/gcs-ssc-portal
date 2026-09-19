import { useDatabase, closeDatabase } from '../server/utils/database'
import { portalConfig } from '../server/utils/config'
try {
  portalConfig()
  await useDatabase()
  console.log('Database migrations ready.')
} finally {
  await closeDatabase()
}
