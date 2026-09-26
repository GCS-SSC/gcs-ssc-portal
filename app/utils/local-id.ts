import { customAlphabet } from 'nanoid'

// Client-owned survey/configuration keys: 24 alphanumeric characters (~143 random bits).
// Uses getRandomValues, which is available during HTTP LAN development.
// Database entity IDs use server-assigned integer keys and public Sqids.
export const createLocalId = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  24
)
