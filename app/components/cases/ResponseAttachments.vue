<script setup lang="ts">
import type { AttachmentLimits, ResponseAttachment } from '~~/shared/types/cases'
const props = defineProps<{
  endpoint: string
  itemId: string
  revision: number
  files: ResponseAttachment[]
  limits: AttachmentLimits
  readonly: boolean
}>()
const emit = defineEmits<{
  change: [result: { revision: number; attachments: ResponseAttachment[] }]
  busy: [value: boolean]
  reload: []
}>()
const api = usePortalApi(),
  { a } = useAttachmentLocale(),
  { errorMessage } = useCaseLocale()
const file = shallowRef<File | null>(null),
  busy = ref(false),
  error = ref(''),
  generation = ref(0),
  conflicted = ref(false)
const files = computed(() => props.files.filter((entry) => entry.itemId === props.itemId))
const upload = async () => {
  if (!file.value || busy.value) return
  if (!file.value.size || file.value.size > props.limits.maxBytes) {
    error.value = a('tooLarge')
    return
  }
  await mutate(() =>
    api(`${props.endpoint}/items/${props.itemId}/attachments`, {
      method: 'POST',
      query: { filename: file.value!.name, expectedRevision: props.revision },
      body: file.value!,
      headers: { 'Content-Type': 'application/octet-stream' }
    })
  )
  file.value = null
  generation.value++
}
const mutate = async (
  action: () => Promise<{ revision: number; attachments: ResponseAttachment[] }>
) => {
  busy.value = true
  emit('busy', true)
  error.value = ''
  try {
    emit('change', await action())
  } catch (failure) {
    error.value = `${errorMessage(failure)} ${a('reload')}`
    conflicted.value = true
  } finally {
    busy.value = false
    emit('busy', false)
  }
}
const remove = (id: string) =>
  mutate(() =>
    api(`${props.endpoint}/attachments/${id}`, {
      method: 'DELETE',
      body: { expectedRevision: props.revision }
    })
  )
</script>
<template>
  <section :aria-label="a('title')">
    <PortalHeading :id="`attachments-${itemId}`" tag="h3">{{ a('title') }}</PortalHeading>
    <PortalNotice v-if="error" variant="error"
      >{{ error }}
      <PortalButton
        v-if="conflicted"
        variant="secondary"
        :disabled="busy"
        @click="emit('reload')"
        >{{ a('reloadAction') }}</PortalButton
      ></PortalNotice
    >
    <PortalText v-if="!files.length">{{ a('empty') }}</PortalText>
    <ul v-else>
      <li v-for="entry in files" :key="entry.id">
        <PortalLink
          v-if="entry.status === 'ready'"
          :to="`${endpoint}/attachments/${entry.id}`"
          external
          >{{ entry.filename }}</PortalLink
        >
        <span v-else>{{ entry.filename }} — {{ a('pending') }}</span>
        <span> ({{ entry.size }} B)</span>
        <PortalButton
          v-if="!readonly"
          variant="secondary"
          :disabled="busy || conflicted"
          @click="remove(entry.id)"
          >{{ a('remove') }} — {{ entry.filename }}</PortalButton
        >
      </li>
    </ul>
    <template v-if="!readonly">
      <PortalNotice v-if="!limits.configured">{{ a('unavailable') }}</PortalNotice>
      <template v-else>
        <PortalFile
          :id="`file-${itemId}`"
          :key="generation"
          :label="a('choose')"
          :hint="`${a('limit')}: ${limits.maxBytes / 1048576}; ${a('count')}: ${limits.maxFilesPerForm}`"
          :disabled="busy || conflicted"
          @change="file = $event"
        />
        <PortalButton :disabled="!file || busy || conflicted" @click="upload">{{
          a(busy ? 'busy' : 'upload')
        }}</PortalButton>
      </template>
    </template>
  </section>
</template>
