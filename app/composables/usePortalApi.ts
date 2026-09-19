/** Keep expired browser sessions from leaving an apparently signed-in workspace. */
export const usePortalApi = () => {
  const { user, government, loaded } = usePortalSession()
  const route = useRoute()
  return $fetch.create({
    onResponseError: async ({ response }) => {
      if (response.status !== 401) return
      user.value = null
      government.value = null
      loaded.value = false
      await navigateTo({
        path: route.path.startsWith('/government') ? '/government/login' : '/login',
        query: { next: route.fullPath }
      })
    }
  })
}
