import { defineEventHandler, getRequestURL } from 'h3'
import type { EvidenceActor } from '../utils/evidence'
import { recordRequestEvidence } from '../utils/evidence'
import { useDatabase } from '../utils/database'

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/api/')) return
  const started = performance.now()
  event.node.res.once('finish', () => {
    const actor = event.context.evidenceActor as EvidenceActor | undefined
    void useDatabase()
      .then((db) =>
        recordRequestEvidence(db, {
          method: event.method,
          path: pathname,
          status: event.node.res.statusCode,
          durationMs: Math.max(0, Math.round(performance.now() - started)),
          actor
        })
      )
      .catch((error: unknown) => {
        console.error('Failed to persist request evidence', error)
      })
  })
})
