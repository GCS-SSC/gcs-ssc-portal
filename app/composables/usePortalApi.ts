/** Keep expired browser sessions from leaving an apparently signed-in workspace. */
export const usePortalApi = () => {
  const { user, loaded } = usePortalSession()
  const administratorSession = useAdministratorSession()
  const route = useRoute()
  return $fetch.create({
    onResponseError: async ({ response }) => {
      if (response.status !== 401) return
      if (route.path.startsWith('/admin')) {
        administratorSession.administrator.value = null
        administratorSession.loaded.value = false
        await navigateTo('/admin/login')
        return
      }
      user.value = null
      loaded.value = false
      await navigateTo({
        path: '/login',
        query: { next: route.fullPath }
      })
    }
  })
}
