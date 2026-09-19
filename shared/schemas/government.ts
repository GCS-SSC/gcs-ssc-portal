import { foreignFields } from './external'
import { z } from 'zod'
export const bilingualName = z
  .object({ nameEn: z.string().trim().min(1).max(200), nameFr: z.string().trim().min(1).max(200) })
  .strict()
export const structureInput = bilingualName.extend(foreignFields)
export const programInput = structureInput.extend({ agencyId: z.uuid() })
export const streamInput = structureInput.extend({ programId: z.uuid() })
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
  .extend({ streamId: z.uuid(), startDate: calendarDate, endDate: calendarDate })
  .refine((value) => value.endDate >= value.startDate, {
    path: ['endDate'],
    message: 'End date must not precede start date'
  })
export const publishInput = z.object({ published: z.boolean() }).strict()
export const staffInvitationInput = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(1).max(120),
    agencyId: z.uuid().nullable().default(null)
  })
  .strict()
export const staffAgencyInput = z
  .object({
    agencyIds: z
      .array(z.uuid())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length)
  })
  .strict()
export const staffStatusInput = z.object({ active: z.boolean() }).strict()
export const integrationTokenInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    agencyId: z.uuid(),
    expiresInDays: z.number().int().min(1).max(365).default(90)
  })
  .strict()
export const bootstrapInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(12).max(128)
  })
  .strict()
