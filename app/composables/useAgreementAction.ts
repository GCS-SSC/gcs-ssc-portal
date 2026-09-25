export const useAgreementAction = () => {
  const busy = ref(false),
    error = ref(''),
    success = ref('')
  const { c, errorMessage } = useAgreementLocale()
  const perform = async (action: () => Promise<unknown>) => {
    if (busy.value) return
    busy.value = true
    error.value = ''
    success.value = ''
    try {
      await action()
      success.value = c('saved')
    } catch (failure) {
      error.value = errorMessage(failure)
    } finally {
      busy.value = false
    }
  }
  return { busy, error, success, perform }
}
