import { foreignFields } from './external'
import { z } from 'zod'
export const bilingualName = z
  .object({ nameEn: z.string().trim().min(1).max(200), nameFr: z.string().trim().min(1).max(200) })
  .strict()
export const structureInput = bilingualName.extend(foreignFields)
export const programInput = structureInput.extend({ agencyId: z.number().int().positive() })
export const streamInput = structureInput.extend({ programId: z.number().int().positive() })
// Validate calendar dates without permitting Date's rollover (e.g. February 31).
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return (
      !value.startsWith('0000-') &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    )
  }, 'Invalid calendar date')
export const callInput = structureInput
  .extend({ streamId: z.number().int().positive(), startDate: calendarDate, endDate: calendarDate })
  .refine((value) => value.endDate >= value.startDate, {
    path: ['endDate'],
    message: 'End date must not precede start date'
  })
export const publishInput = z.object({ published: z.boolean() }).strict()
export const integrationTokenInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    agencyId: z.number().int().positive(),
    expiresInDays: z.number().int().min(1).max(365).default(90)
  })
  .strict()
export const bootstrapInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128)
  })
  .strict()
