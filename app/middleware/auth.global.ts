export default defineNuxtRouteMiddleware(async (to) => {
  const { user, government, governmentAccount, loaded, refresh } = usePortalSession()
  if (!loaded.value) await refresh()
  const organizationRoute =
    to.path.startsWith('/organizations') ||
    to.path.startsWith('/funding') ||
    to.path.startsWith('/forms') ||
    to.path.startsWith('/invitations/')
  if (
    user.value &&
    governmentAccount.value &&
    (organizationRoute || ['/login', '/register'].includes(to.path))
  )
    return navigateTo('/government')
  if (organizationRoute && !user.value)
    return navigateTo({ path: '/login', query: { next: to.fullPath } })
  if (
    to.path.startsWith('/government') &&
    to.path !== '/government/login' &&
    !to.path.startsWith('/government/invitations/')
  ) {
    await refresh()
    if (!user.value || !government.value)
      return navigateTo({ path: '/government/login', query: { next: to.fullPath } })
    if (
      ['/government/staff', '/government/integrations'].includes(to.path) &&
      government.value.role !== 'root'
    )
      return navigateTo('/government')
  }
})
