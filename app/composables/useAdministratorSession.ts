interface Administrator {
  id: string
  name: string
  email: string
}

export const useAdministratorSession = () => {
  const administrator = useState<Administrator | null>('administrator', () => null)
  const loaded = useState('administrator-loaded', () => false)
  const refresh = async () => {
    const response = await $fetch<{ administrator: Administrator | null }>('/api/admin/session')
    administrator.value = response.administrator
    loaded.value = true
  }
  const signOut = async () => {
    await $fetch('/api/admin/logout', { method: 'POST', body: {} })
    administrator.value = null
    loaded.value = true
    await navigateTo('/admin/login')
  }
  return { administrator, loaded, refresh, signOut }
}
