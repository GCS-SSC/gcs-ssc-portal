<script setup lang="ts">
import type {
  SetResponse,
  LineBalance,
  SubmissionCheck,
  ResponseResult
} from '~~/shared/types/agreements'
import type { Organization } from '~~/shared/types/api'
import {
  responseSubjects,
  attachmentsAllowed,
  documentationAttachmentItemId
} from '~~/shared/schemas/agreements'
import { hasAccess } from '~~/shared/utils/permissions'
import FinancialResponse from '~/components/agreements/FinancialResponse.vue'
import ResponseAttachments from '~/components/agreements/ResponseAttachments.vue'
import ResponseSurvey from '~/components/agreements/ResponseSurvey.vue'
definePageMeta({ key: (route) => route.fullPath })
const route = useRoute(),
  organizationId = String(route.params.id),
  id = String(route.params.responseId)
const base = `/api/organizations/${organizationId}`,
  endpoint = `${base}/responses/${id}`
const api = usePortalApi(),
  { c, errorMessage } = useAgreementLocale(),
  { localized } = useGovernmentLocale()
const { busy, error, success, perform } = useAgreementAction()
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
const { a } = useAttachmentLocale()
const { locale, date } = useLocale()
const attachmentGeneration = ref(0)
const uploading = ref(false)
const response = ref<SetResponse | null>(null),
  balances = ref<LineBalance[]>([]),
  recorded = ref(false),
  submittedBalances = ref<LineBalance[] | null>(null),
  review = ref<SubmissionCheck | null>(null),
  position = ref(0),
  deleting = ref(false),
  saved = ref('')
const documentationMessage = ref('')
const sentAttachmentIds = computed(
  () => data.value?.details.flatMap((detail) => detail.attachmentIds) ?? []
)
const unsentAttachments = computed(
  () =>
    data.value?.attachments.filter(
      (file) =>
        file.itemId === documentationAttachmentItemId &&
        file.status === 'ready' &&
        !sentAttachmentIds.value.includes(file.id)
    ) ?? []
)
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
const reload = async () => {
  if (uploading.value || (dirty.value && !window.confirm(a('discard')))) return
  await refresh()
  if (!loadError.value) attachmentGeneration.value++
}
const allowed = (level: 'contributor' | 'manager') =>
  !!response.value &&
  responseSubjects(response.value.snapshot).every((subject) =>
    hasAccess(data.value?.organization.permissions ?? [], subject, level)
  )
const editable = computed(
  () =>
    response.value?.status === 'draft' &&
    allowed('contributor') &&
    !review.value &&
    !busy.value &&
    !uploading.value
)
const manager = computed(() => response.value?.status === 'draft' && allowed('manager'))
const agreementSection = computed(() => {
  const financialKind = response.value?.snapshot.items.find(
    ({ item }) => item.kind === 'claim' || item.kind === 'forecast'
  )?.item.kind
  return financialKind === 'claim' ? 'claims' : financialKind === 'forecast' ? 'forecasts' : 'other'
})
const back = computed(() =>
  response.value?.snapshot.application
    ? `/organizations/${organizationId}?section=funding`
    : response.value?.snapshot.agreementReference
      ? `/organizations/${organizationId}/agreements/${response.value.snapshot.agreementReference.id}?section=${agreementSection.value}`
      : `/organizations/${organizationId}?section=agreements`
)
const canDocument = computed(
  () => response.value?.status === 'awaiting_documentation' && allowed('contributor')
)
const sendDetails = () =>
  perform(async () => {
    const result = await api<ResponseResult>(`${endpoint}/details`, {
      method: 'POST',
      body: {
        expectedRevision: response.value!.revision,
        body: documentationMessage.value,
        attachmentIds: unsentAttachments.value.map((file) => file.id)
      }
    })
    response.value = result.response
    data.value!.details = result.details
    data.value!.attachments = result.attachments
    documentationMessage.value = ''
  }, 'detailsSent')
const attachmentChange = (result: {
  revision: number
  attachments: ResponseResult['attachments']
}) => {
  if (response.value && data.value) {
    response.value.revision = result.revision
    data.value.attachments = result.attachments
    review.value = null
  }
}
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
    await navigateTo(back.value)
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
  if (dirty.value || uploading.value) event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', leave))
onBeforeUnmount(() => window.removeEventListener('beforeunload', leave))
onBeforeRouteLeave(() => !uploading.value && (!dirty.value || window.confirm(c('dirty'))))
const changePosition = async (next: number) => {
  if (uploading.value || busy.value) return
  position.value = next
  await nextTick()
  document.getElementById('response-item')?.focus()
}
</script>
<template>
  <section>
    <PortalLink :to="back">{{ c('back') }}</PortalLink>
    <PortalNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <PortalButton @click="reload">{{ c('reload') }}</PortalButton></PortalNotice
    >
    <template v-if="response">
      <PortalHeading tag="h1">{{ localized(response.snapshot) }}</PortalHeading>
      <div class="badges">
        <PortalBadge>{{ c(response.status) }}</PortalBadge>
        <PortalBadge v-if="response.gcsStatus" :colour="response.gcsStatus.colour">{{
          response.gcsStatus[locale]
        }}</PortalBadge>
      </div>
      <PortalText>{{ c(response.status === 'draft' ? 'sharedDraft' : 'finalNotice') }}</PortalText>
      <PortalNotice v-if="error" variant="error"
        >{{ error }}
        <PortalButton variant="secondary" @click="reload">{{
          c('reload')
        }}</PortalButton></PortalNotice
      >
      <PortalNotice v-if="success" variant="success">{{ success }}</PortalNotice>
      <section v-if="review" class="confirmation" :aria-label="c('confirmTitle')">
        <PortalHeading id="review-heading" tag="h2">{{ c('confirmTitle') }}</PortalHeading>
        <PortalText>{{ c('confirmHint') }}</PortalText>
        <PortalNotice
          v-for="warning in review.warnings"
          :key="`${warning.kind}-${warning.budgetLineId}`"
        >
          {{ c(warning.kind) }} —
          {{
            localized(
              response.snapshot.agreement!.config.budgetLines.find(
                (line) => line.id === warning.budgetLineId
              )!
            )
          }}:
          {{ c(warning.reason as 'overBalance' | 'balanceUnknown' | 'lineUnavailable') }}
          {{ c('amount') }}: {{ warning.amount }}; {{ c('balance') }}:
          {{ warning.balance ?? c('unknown') }}
        </PortalNotice>
        <PortalText v-if="review.warnings.length">{{ c('warningHint') }}</PortalText>
        <div class="form-actions">
          <PortalButton :disabled="uploading || busy" @click="submit">{{
            c('submit')
          }}</PortalButton
          ><PortalButton variant="secondary" :disabled="uploading || busy" @click="review = null">{{
            c('cancel')
          }}</PortalButton>
        </div>
      </section>
      <PortalText v-if="response.snapshot.agreement && response.status !== 'draft'">
        {{ c(recorded ? 'recordedBalances' : 'latestBalances') }}
      </PortalText>
      <PortalButton
        v-if="submittedBalances && !recorded"
        variant="secondary"
        @click="showRecorded"
        >{{ c('recordedBalances') }}</PortalButton
      >
      <div id="response-item" tabindex="-1">
        <PortalText>{{ c('item') }} {{ position + 1 }} / {{ response.items.length }}</PortalText>
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
          <ResponseAttachments
            v-if="data && attachmentsAllowed(published)"
            :key="`${current.id}-${response.id}-${attachmentGeneration}`"
            :endpoint="endpoint"
            :item-id="current.id"
            :revision="response.revision"
            :files="data.attachments"
            :limits="data.attachmentLimits"
            :readonly="!editable && !uploading"
            @busy="uploading = $event"
            @change="attachmentChange"
            @reload="reload"
          />
        </template>
      </div>
      <div class="form-actions">
        <PortalButton
          v-if="position > 0"
          variant="secondary"
          :disabled="uploading || busy"
          @click="changePosition(position - 1)"
          >{{ c('previousItem') }}</PortalButton
        ><PortalButton
          v-if="position < response.items.length - 1"
          variant="secondary"
          :disabled="uploading || busy"
          @click="changePosition(position + 1)"
          >{{ c('nextItem') }}</PortalButton
        >
      </div>
      <section
        v-if="response.status !== 'draft'"
        class="content-section"
        :aria-label="c('documentation')"
      >
        <PortalHeading tag="h2" margin-top="0">{{ c('documentation') }}</PortalHeading>
        <ul v-if="data?.details.length" class="organization-list">
          <li v-for="detail in data.details" :key="detail.id">
            <div>
              <PortalText>{{ detail.body }}</PortalText>
              <ul v-if="detail.attachmentIds.length">
                <li v-for="attachmentId in detail.attachmentIds" :key="attachmentId">
                  <PortalLink :to="`${endpoint}/attachments/${attachmentId}`" external>{{
                    data.attachments.find((file) => file.id === attachmentId)?.filename
                  }}</PortalLink>
                </li>
              </ul>
              <PortalText size="small" text-role="secondary">{{
                date(detail.createdAt)
              }}</PortalText>
            </div>
          </li>
        </ul>
        <template v-if="canDocument && data">
          <PortalText>{{ c('documentationHint') }}</PortalText>
          <ResponseAttachments
            :item-id="documentationAttachmentItemId"
            :endpoint="endpoint"
            :revision="response.revision"
            :files="data.attachments"
            :limits="data.attachmentLimits"
            :locked-ids="sentAttachmentIds"
            :readonly="busy || uploading"
            @busy="uploading = $event"
            @change="attachmentChange"
            @reload="reload"
          />
          <PortalTextarea
            id="documentation-message"
            v-model="documentationMessage"
            :label="c('documentationMessage')"
            :maxlength="4000"
            :rows="5"
          />
          <PortalButton
            :disabled="
              busy || uploading || (!documentationMessage.trim() && !unsentAttachments.length)
            "
            @click="sendDetails"
            >{{ c('sendDetails') }}</PortalButton
          >
        </template>
      </section>
      <PortalText v-if="dirty">{{ c('dirty') }}</PortalText>
      <div class="form-actions">
        <PortalButton v-if="editable" :disabled="uploading || busy" @click="save">{{
          c('saveDraft')
        }}</PortalButton>
        <PortalButton
          v-if="manager && !review"
          :disabled="uploading || busy || !!dirty"
          @click="prepare"
          >{{ c('reviewSubmit') }}</PortalButton
        >
        <PortalButton
          v-if="response.snapshot.agreement"
          variant="secondary"
          :disabled="uploading || busy"
          @click="updateBalances"
          >{{ c('refreshBalances') }}</PortalButton
        >
        <PortalButton
          v-if="manager && !review"
          variant="secondary"
          :disabled="uploading || busy"
          @click="deleting = true"
          >{{ c('deleteDraft') }}</PortalButton
        >
      </div>
      <section v-if="deleting" class="confirmation">
        <PortalText>{{ c('deleteConfirm') }}</PortalText>
        <div class="form-actions">
          <PortalButton :disabled="uploading || busy" @click="remove">{{
            c('deleteDraft')
          }}</PortalButton
          ><PortalButton
            variant="secondary"
            :disabled="uploading || busy"
            @click="deleting = false"
            >{{ c('cancel') }}</PortalButton
          >
        </div>
      </section>
    </template>
  </section>
</template>
