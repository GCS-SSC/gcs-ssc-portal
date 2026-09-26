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
import { publicCode } from '~~/shared/utils/response-code'
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
  review = ref<SubmissionCheck | null>(null),
  position = ref(0),
  saved = ref('')
const documentationMessage = ref('')
const sentAttachmentIds = computed(
  () => data.value?.details.flatMap((detail) => detail.attachmentIds) ?? []
)
const stagedAttachments = computed(
  () =>
    data.value?.attachments.filter(
      (file) =>
        file.itemId === documentationAttachmentItemId && !sentAttachmentIds.value.includes(file.id)
    ) ?? []
)
const unsentAttachments = computed(() =>
  stagedAttachments.value.filter(
    (file) => file.status === 'ready' && file.sender === 'organization'
  )
)
watch(
  data,
  (next) => {
    if (next) {
      response.value = structuredClone(next.response)
      balances.value = next.balances
      saved.value = JSON.stringify(next.response.items)
      review.value = null
    }
  },
  { immediate: true }
)
const dirty = computed(() => response.value && JSON.stringify(response.value.items) !== saved.value)
const currentOutcome = computed(() => {
  const submissionId = response.value?.submissionId
  if (!submissionId) return null
  return data.value?.outcomes.find((outcome) =>
    outcome.itemSubmissionId === `${submissionId}-${publicCode(position.value + 1, 'Y')}`) ?? null
})
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
const isFinancial = computed(
  () => current.value?.kind === 'claim' || current.value?.kind === 'forecast'
)
const published = computed(() => response.value?.snapshot.items[position.value])
const save = () =>
  perform(async () => {
    const result = await api<ResponseResult>(endpoint, {
      method: 'PUT',
      body: { expectedRevision: response.value!.revision, items: response.value!.items }
    })
    response.value = result.response
    balances.value = result.balances
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
    balances.value = result.balances
    review.value = null
    saved.value = JSON.stringify(result.response.items)
  })
const withdraw = () => {
  if (!window.confirm(c('withdrawConfirm'))) return
  void perform(async () => {
    const result = await api<ResponseResult>(`${endpoint}/withdraw`, {
      method: 'POST',
      body: { expectedRevision: response.value!.revision }
    })
    response.value = result.response
    data.value!.attachments = result.attachments
    data.value!.details = result.details
  }, 'withdrawalComplete')
}
const reopen = () =>
  perform(async () => {
    const result = await api<ResponseResult>(`${endpoint}/reopen`, {
      method: 'POST',
      body: { expectedRevision: response.value!.revision }
    })
    await navigateTo(`/organizations/${organizationId}/responses/${result.response.id}`)
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
      <PortalText v-if="response.status !== 'draft' || !isFinancial">{{
        c(
          response.status === 'draft'
            ? 'sharedDraft'
            : response.status === 'withdrawn'
              ? 'withdrawnNotice'
              : 'finalNotice'
        )
      }}</PortalText>
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
      <div id="response-item" tabindex="-1">
        <PortalText v-if="response.items.length > 1"
          >{{ c('item') }} {{ position + 1 }} / {{ response.items.length }}</PortalText
        >
        <div v-if="currentOutcome" class="badges">
          <PortalBadge v-if="currentOutcome.gcsStatus" :colour="currentOutcome.gcsStatus.colour">{{
            currentOutcome.gcsStatus[locale]
          }}</PortalBadge>
          <PortalText v-if="currentOutcome.remoteReference">{{ c('gcsReference') }}:
            {{ currentOutcome.remoteReference }}</PortalText>
        </div>
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
            :show-balances="response.status === 'draft'"
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
              <PortalText>
                <strong>{{ detail.senderName }}</strong> —
                <span>{{
                  c(detail.sender === 'government' ? 'governmentSender' : 'organizationSender')
                }}</span>
              </PortalText>
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
            :files="stagedAttachments"
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
      <div class="form-actions response-actions">
        <PortalButton
          v-if="
            response.status !== 'draft' &&
            response.status !== 'withdrawn' &&
            (response.gcsStatus === null || response.gcsStatus.isWithdrawable === true) &&
            allowed('manager')
          "
          variant="secondary"
          :disabled="uploading || busy"
          @click="withdraw"
          >{{ c('withdrawSubmission') }}</PortalButton
        >
        <PortalButton
          v-if="response.status === 'withdrawn' && allowed('contributor')"
          variant="secondary"
          :disabled="uploading || busy"
          @click="reopen"
          >{{ c('reopenSubmission') }}</PortalButton
        >
        <div class="form-actions response-actions-right">
          <PortalButton
            v-if="editable"
            variant="secondary"
            :disabled="uploading || busy"
            @click="save"
            >{{ c('saveDraft') }}</PortalButton
          >
          <PortalButton
            v-if="manager && !review"
            :disabled="uploading || busy || !!dirty"
            @click="prepare"
            >{{ c('submitAction') }}</PortalButton
          >
        </div>
      </div>
    </template>
  </section>
</template>
<style scoped>
.response-actions {
  margin-top: var(--gcds-spacing-400);
}
.response-actions-right {
  margin-left: auto;
}
</style>
