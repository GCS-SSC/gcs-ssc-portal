import type { GovernmentAccess } from '~~/shared/types/government'
import type { PortalUser } from '~~/shared/types/api'
export const usePortalSession = () => {
  const user = useState<PortalUser | null>('portal-user', () => null)
  const government = useState<GovernmentAccess | null>('government-access', () => null)
  const governmentAccount = useState('government-account', () => false)
  const loaded = useState('portal-session-loaded', () => false)
  const refresh = async () => {
    const response = await $fetch<{
      user: PortalUser | null
      government: GovernmentAccess | null
      governmentAccount: boolean
    }>('/api/session')
    user.value = response.user
    government.value = response.government
    governmentAccount.value = response.governmentAccount
    loaded.value = true
  }
  const signOut = async (next = '/login') => {
    await $fetch('/api/auth/sign-out', { method: 'POST', body: {} })
    user.value = null
    government.value = null
    governmentAccount.value = false
    loaded.value = true
    await navigateTo(next)
  }
  return { user, government, governmentAccount, loaded, refresh, signOut }
}
