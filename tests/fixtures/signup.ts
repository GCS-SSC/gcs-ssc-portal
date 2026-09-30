import type { APIRequestContext, APIResponse } from '@playwright/test'

/** A shared test server uses one IP; respect its production signup rate limit. */
export const signUpApplicant = async (
  request: APIRequestContext,
  options: { data: { name: string; email: string; password: string } }
): Promise<APIResponse> => {
  const response = await request.post('/api/auth/sign-up/email', options)
  if (response.status() !== 429) return response
  const header = response.headers()['retry-after'] ?? response.headers()['x-retry-after']
  if (!header || !/^\d+$/.test(header) || Number(header) < 1 || Number(header) > 60) {
    throw new Error(`Signup rate limit returned an invalid retry delay: ${header ?? 'missing'}`)
  }
  await new Promise((resolve) => setTimeout(resolve, Number(header) * 1000 + 100))
  // Only one retry; the caller still asserts and reports the final response.
  return request.post('/api/auth/sign-up/email', options)
}
