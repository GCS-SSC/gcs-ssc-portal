/** Shared pending and error handling; forms keep their values when a request fails. */
export const useGovernmentAction = () => {
  const busy = ref(false),
    error = ref(''),
    success = ref('')
  const message = useApiMessage()
  const { g } = useGovernmentLocale()
  const perform = async (action: () => Promise<unknown>) => {
    if (busy.value) return
    busy.value = true
    error.value = ''
    success.value = ''
    try {
      await action()
      success.value = g('saved')
    } catch (failure) {
      error.value = message(failure)
    } finally {
      busy.value = false
    }
  }
  return { busy, error, success, perform }
}
