import { z } from 'zod'
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
      .array(z.enum(['user', 'admin', 'application']))
      .min(1)
      .max(3)
      .refine(
        (values) => values.includes('user') && new Set(values).size === values.length,
        'User permission is required; permissions must be unique'
      )
  })
  .strict()
export const transferInput = z.object({ userId: z.string().min(1).max(128) }).strict()
export const organizationId = z.uuid()
