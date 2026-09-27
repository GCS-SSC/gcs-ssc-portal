export const useAgreementAction = () => {
  const { c, errorMessage } = useAgreementLocale()
  const busy = ref(false),
    failure = shallowRef<unknown>(null),
    successKey = ref<Parameters<typeof c>[0] | null>(null)
  const error = computed(() => (failure.value ? errorMessage(failure.value) : ''))
  const success = computed(() => (successKey.value ? c(successKey.value) : ''))
  const perform = async (
    action: () => Promise<unknown>,
    messageKey: Parameters<typeof c>[0] | null = 'saved'
  ) => {
    if (busy.value) return
    busy.value = true
    failure.value = null
    successKey.value = null
    try {
      await action()
      successKey.value = messageKey
    } catch (error) {
      failure.value = error
    } finally {
      busy.value = false
    }
  }
  return { busy, error, success, perform }
}
