import { z } from 'zod'
import { organizationNumber } from '../utils/response-code'
export const organizationCodeInput = z
  .string()
  .refine((value) => organizationNumber(value) !== null)
export const organizationInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).default('')
  })
  .strict()
export const invitationInput = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().max(120).default('')
  })
  .strict()
export const permissionsInput = z
  .object({
    permissions: z
      .array(z.string())
      .min(1)
      .max(6)
      .transform((values) =>
        values.map((value) => (value === 'application' ? 'application:viewer' : value))
      )
      .pipe(
        z.array(
          z.custom<import('../utils/permissions').OrganizationPermission>(
            (value) =>
              typeof value === 'string' &&
              /^(user|admin|(?:application|claim|forecast|form):(?:viewer|contributor|manager))$/.test(
                value
              )
          )
        )
      )
      .refine(
        (values) =>
          values.includes('user') &&
          new Set(values.map((value) => value.split(':')[0])).size === values.length,
        'User membership and unique subjects are required'
      )
  })
  .strict()
export const transferInput = z.object({ userId: z.number().int().positive() }).strict()
