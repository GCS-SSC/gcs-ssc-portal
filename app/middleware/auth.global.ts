export default defineNuxtRouteMiddleware(async (to) => {
  const { user, governmentAccount, loaded, refresh } = usePortalSession()
  if (to.path.startsWith('/admin')) {
    const admin = useAdministratorSession()
    if (!admin.loaded.value) await admin.refresh()
    if (to.path !== '/admin/login' && !admin.administrator.value) return navigateTo('/admin/login')
    if (to.path === '/admin/login' && admin.administrator.value) return navigateTo('/admin')
    return
  }
  if (!loaded.value) await refresh()
  const organizationRoute =
    to.path.startsWith('/organizations') ||
    to.path.startsWith('/funding') ||
    to.path.startsWith('/forms')
  if (
    user.value &&
    governmentAccount.value &&
    (organizationRoute || ['/login', '/register'].includes(to.path))
  )
    return navigateTo('/login')
  if (organizationRoute && !user.value)
    return navigateTo({ path: '/login', query: { next: to.fullPath } })
})
