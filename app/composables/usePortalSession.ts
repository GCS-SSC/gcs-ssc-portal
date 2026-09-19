import type { GovernmentAccess } from '~~/shared/types/government'
import type { PortalUser } from '~~/shared/types/api'
export const usePortalSession = () => {
  const user = useState<PortalUser | null>('portal-user', () => null)
  const government = useState<GovernmentAccess | null>('government-access', () => null)
  const loaded = useState('portal-session-loaded', () => false)
  const refresh = async () => {
    const response = await $fetch<{ user: PortalUser | null; government: GovernmentAccess | null }>(
      '/api/session'
    )
    user.value = response.user
    government.value = response.government
    loaded.value = true
  }
  const signOut = async (next = '/login') => {
    await $fetch('/api/auth/sign-out', { method: 'POST', body: {} })
    user.value = null
    government.value = null
    loaded.value = true
    await navigateTo(next)
  }
  return { user, government, loaded, refresh, signOut }
}
