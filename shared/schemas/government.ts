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
export const utcTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/, 'Use a UTC time')
  .transform((value) => {
    const [hour, minute, seconds = '00'] = value.split(':')
    const [second, fraction = ''] = seconds.split('.')
    return `${hour}:${minute}:${second}.${fraction.padEnd(6, '0')}`
  })
export const callInput = structureInput
  .extend({
    streamId: z.number().int().positive(),
    startDate: calendarDate,
    startTime: utcTime.default('00:00:00.000000'),
    endDate: calendarDate,
    endTime: utcTime.default('23:59:59.999999')
  })
  .refine(
    (value) => `${value.endDate}T${value.endTime}` > `${value.startDate}T${value.startTime}`,
    {
      path: ['endTime'],
      message: 'End date and time must follow start date and time'
    }
  )
export const publishInput = z.object({ published: z.boolean() }).strict()
export const integrationTokenInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    agencyId: z.number().int().positive(),
    expiresInDays: z.number().int().min(1).max(365).nullable().default(90)
  })
  .strict()
export const bootstrapInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128)
  })
  .strict()
