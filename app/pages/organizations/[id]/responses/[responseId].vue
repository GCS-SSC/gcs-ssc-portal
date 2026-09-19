<script setup lang="ts">
import type {
  SetResponse,
  LineBalance,
  SubmissionCheck,
  ResponseResult
} from '~~/shared/types/cases'
import type { Organization } from '~~/shared/types/api'
import { setSubjects } from '~~/shared/schemas/cases'
import { hasAccess } from '~~/shared/utils/permissions'
import FinancialResponse from '~/components/cases/FinancialResponse.vue'
import ResponseSurvey from '~/components/cases/ResponseSurvey.vue'
definePageMeta({ key: (route) => route.fullPath })
const route = useRoute(),
  organizationId = String(route.params.id),
  id = String(route.params.responseId)
const base = `/api/organizations/${organizationId}`,
  endpoint = `${base}/responses/${id}`
const api = usePortalApi(),
  { c, errorMessage } = useCaseLocale(),
  { localized } = useGovernmentLocale()
const { busy, error, success, perform } = useCaseAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData(`response-${id}`, async () => {
  const [result, org] = await Promise.all([
    api<ResponseResult>(endpoint),
    api<{ organization: Organization }>(base)
  ])
  return { ...result, ...org }
})
const response = ref<SetResponse | null>(null),
  balances = ref<LineBalance[]>([]),
  recorded = ref(false),
  submittedBalances = ref<LineBalance[] | null>(null),
  review = ref<SubmissionCheck | null>(null),
  position = ref(0),
  deleting = ref(false),
  saved = ref('')
watch(
  data,
  (next) => {
    if (next) {
      response.value = structuredClone(next.response)
      balances.value = next.submittedBalances ?? next.balances
      submittedBalances.value = next.submittedBalances
      recorded.value = !!next.submittedBalances
      saved.value = JSON.stringify(next.response.items)
      review.value = null
    }
  },
  { immediate: true }
)
const dirty = computed(() => response.value && JSON.stringify(response.value.items) !== saved.value)
const allowed = (level: 'contributor' | 'manager') =>
  !!response.value &&
  setSubjects(response.value.snapshot.items.map((entry) => entry.item)).every((subject) =>
    hasAccess(data.value?.organization.permissions ?? [], subject, level)
  )
const editable = computed(
  () => response.value?.status === 'draft' && allowed('contributor') && !review.value && !busy.value
)
const manager = computed(() => response.value?.status === 'draft' && allowed('manager'))
const current = computed(() => response.value?.items[position.value])
const published = computed(() => response.value?.snapshot.items[position.value])
const save = () =>
  perform(async () => {
    const result = await api<ResponseResult>(endpoint, {
      method: 'PUT',
      body: { expectedRevision: response.value!.revision, items: response.value!.items }
    })
    response.value = result.response
    submittedBalances.value = result.submittedBalances
    recorded.value = !!result.submittedBalances
    balances.value = result.submittedBalances ?? result.balances
    saved.value = JSON.stringify(result.response.items)
  })
const prepare = () =>
  perform(async () => {
    review.value = await api<SubmissionCheck>(`${endpoint}/check`, {
      method: 'POST',
      body: { expectedRevision: response.value!.revision }
    })
    balances.value = review.value.balances
  })
const submit = () =>
  perform(async () => {
    const result = await api<ResponseResult>(`${endpoint}/submit`, {
      method: 'POST',
      body: {
        expectedRevision: response.value!.revision,
        balanceRevision: review.value!.balanceRevision,
        warningsAcknowledged: true
      }
    })
    response.value = result.response
    submittedBalances.value = result.submittedBalances
    recorded.value = !!result.submittedBalances
    balances.value = result.submittedBalances ?? result.balances
    review.value = null
    saved.value = JSON.stringify(result.response.items)
  })
const remove = () =>
  perform(async () => {
    await api<unknown>(endpoint, {
      method: 'DELETE',
      body: { expectedRevision: response.value!.revision }
    })
    saved.value = JSON.stringify(response.value!.items)
    await navigateTo(`/organizations/${organizationId}/work`)
  })
const showRecorded = () => {
  if (submittedBalances.value) {
    balances.value = submittedBalances.value
    recorded.value = true
  }
}
const updateBalances = () =>
  perform(async () => {
    const result = await api<{ balances: LineBalance[] }>(endpoint)
    balances.value = result.balances
    recorded.value = false
    review.value = null
  })
const leave = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', leave))
onBeforeUnmount(() => window.removeEventListener('beforeunload', leave))
onBeforeRouteLeave(() => !dirty.value || window.confirm(c('dirty')))
const changePosition = async (next: number) => {
  position.value = next
  await nextTick()
  document.getElementById('response-item')?.focus()
}
</script>
<template>
  <section>
    <ThemeLink :to="`/organizations/${organizationId}/work`">{{ c('back') }}</ThemeLink>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <ThemeButton @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
    >
    <template v-if="response">
      <h1>{{ localized(response.snapshot) }}</h1>
      <ThemeBadge>{{ c(response.status) }}</ThemeBadge>
      <p>{{ c(response.status === 'submitted' ? 'finalNotice' : 'sharedDraft') }}</p>
      <ThemeNotice v-if="error" variant="error"
        >{{ error }}
        <ThemeButton variant="link" @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
      >
      <ThemeNotice v-if="success" variant="success">{{ success }}</ThemeNotice>
      <section v-if="review" class="confirmation" aria-labelledby="review-heading">
        <h2 id="review-heading">{{ c('confirmTitle') }}</h2>
        <p>{{ c('confirmHint') }}</p>
        <ThemeNotice
          v-for="warning in review.warnings"
          :key="`${warning.kind}-${warning.budgetLineId}`"
        >
          {{ c(warning.kind) }} —
          {{
            localized(
              response.snapshot.case!.config.budgetLines.find(
                (line) => line.id === warning.budgetLineId
              )!
            )
          }}:
          {{ c(warning.reason as 'overBalance' | 'balanceUnknown' | 'lineUnavailable') }}
          {{ c('amount') }}: {{ warning.amount }}; {{ c('balance') }}:
          {{ warning.balance ?? c('unknown') }}
        </ThemeNotice>
        <p v-if="review.warnings.length">{{ c('warningHint') }}</p>
        <div class="form-actions">
          <ThemeButton :disabled="busy" @click="submit">{{ c('submit') }}</ThemeButton
          ><ThemeButton variant="secondary" :disabled="busy" @click="review = null">{{
            c('cancel')
          }}</ThemeButton>
        </div>
      </section>
      <p v-if="response.snapshot.case && response.status === 'submitted'">
        {{ c(recorded ? 'recordedBalances' : 'latestBalances') }}
      </p>
      <ThemeButton
        v-if="submittedBalances && !recorded"
        variant="secondary"
        @click="showRecorded"
        >{{ c('recordedBalances') }}</ThemeButton
      >
      <div id="response-item" tabindex="-1">
        <p>{{ c('item') }} {{ position + 1 }} / {{ response.items.length }}</p>
        <template v-if="current && published">
          <ResponseSurvey
            v-if="current.kind === 'survey' && published.survey"
            :key="current.id"
            v-model="current.answers"
            :definition="published.survey"
            :readonly="!editable"
          />
          <FinancialResponse
            v-else-if="current.kind !== 'survey'"
            :key="current.id"
            :model-value="current"
            :snapshot="response.snapshot"
            :balances="balances"
            :readonly="!editable"
            @update:model-value="response!.items[position] = $event"
          />
        </template>
      </div>
      <div class="form-actions">
        <ThemeButton
          v-if="position > 0"
          variant="secondary"
          @click="changePosition(position - 1)"
          >{{ c('previousItem') }}</ThemeButton
        ><ThemeButton
          v-if="position < response.items.length - 1"
          variant="secondary"
          @click="changePosition(position + 1)"
          >{{ c('nextItem') }}</ThemeButton
        >
      </div>
      <p v-if="dirty">{{ c('dirty') }}</p>
      <div class="form-actions">
        <ThemeButton v-if="editable" :disabled="busy" @click="save">{{
          c('saveDraft')
        }}</ThemeButton>
        <ThemeButton v-if="manager && !review" :disabled="busy || !!dirty" @click="prepare">{{
          c('reviewSubmit')
        }}</ThemeButton>
        <ThemeButton
          v-if="response.snapshot.case"
          variant="secondary"
          :disabled="busy"
          @click="updateBalances"
          >{{ c('refreshBalances') }}</ThemeButton
        >
        <ThemeButton
          v-if="manager && !review"
          variant="secondary"
          :disabled="busy"
          @click="deleting = true"
          >{{ c('deleteDraft') }}</ThemeButton
        >
      </div>
      <section v-if="deleting" class="confirmation">
        <p>{{ c('deleteConfirm') }}</p>
        <div class="form-actions">
          <ThemeButton :disabled="busy" @click="remove">{{ c('deleteDraft') }}</ThemeButton
          ><ThemeButton variant="secondary" :disabled="busy" @click="deleting = false">{{
            c('cancel')
          }}</ThemeButton>
        </div>
      </section>
    </template>
  </section>
</template>
