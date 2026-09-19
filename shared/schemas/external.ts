import { z } from 'zod'
export const externalId = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine(
    (value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= BigInt('9223372036854775807')
  )
export const foreignFields = {
  sourceSystem: z.string().trim().min(1).max(100).optional(),
  foreignSystemId: externalId.nullable().optional()
}
