import { defineNitroPlugin } from 'nitropack/runtime'
import { cleanupAttachments } from '../utils/attachments'
import { useDatabase } from '../utils/database'
export default defineNitroPlugin((nitroApp) => {
  let running: Promise<void> | undefined
  const cleanup = () => {
    if (running) return
    running = (async () => {
      try {
        const result = await cleanupAttachments(await useDatabase())
        if (result.failed)
          console.warn(
            `Attachment cleanup could not remove ${result.failed} objects; they will be retried.`
          )
      } catch {
        console.warn('Attachment cleanup failed; it will be retried.')
      }
    })().finally(() => {
      running = undefined
    })
  }
  const timer = setInterval(cleanup, 15 * 60 * 1000)
  timer.unref()
  nitroApp.hooks.hook('close', async () => {
    clearInterval(timer)
    await running
  })
})
