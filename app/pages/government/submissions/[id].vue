<script setup lang="ts">
import type { ResponseResult } from '~~/shared/types/cases'
import { attachmentsAllowed } from '~~/shared/schemas/cases'
import ResponseSurvey from '~/components/cases/ResponseSurvey.vue'
import FinancialResponse from '~/components/cases/FinancialResponse.vue'
import ResponseAttachments from '~/components/cases/ResponseAttachments.vue'
definePageMeta({ key: (route) => route.fullPath })
const id = String(useRoute().params.id),
  endpoint = `/api/government/submissions/${id}`,
  api = usePortalApi()
const { c, errorMessage } = useCaseLocale(),
  { localized } = useGovernmentLocale()
const { data, error, refresh } = await useAsyncData(`submission-${id}`, () =>
  api<ResponseResult & { organization: { id: string; name: string } }>(`${endpoint}/response`)
)
</script>
<template>
  <section>
    <ThemeLink to="/government">{{ c('back') }}</ThemeLink>
    <ThemeNotice v-if="error" variant="error"
      >{{ errorMessage(error) }}
      <ThemeButton @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
    >
    <template v-if="data">
      <h1>{{ localized(data.response.snapshot) }}</h1>
      <p>{{ data.organization.name }} · {{ data.response.submittedAt }}</p>
      <p>{{ c('finalNotice') }}</p>
      <section v-for="(item, index) in data.response.items" :key="item.id" class="content-section">
        <h2>{{ c('item') }} {{ index + 1 }}</h2>
        <ResponseSurvey
          v-if="item.kind === 'survey' && data.response.snapshot.items[index]?.survey"
          :model-value="item.answers"
          :definition="data.response.snapshot.items[index]!.survey!"
          readonly
        />
        <FinancialResponse
          v-else-if="item.kind !== 'survey'"
          :model-value="item"
          :snapshot="data.response.snapshot"
          :balances="data.balances"
          readonly
        />
        <ResponseAttachments
          v-if="attachmentsAllowed(data.response.snapshot.items[index]!)"
          :endpoint="endpoint"
          :item-id="item.id"
          :revision="data.response.revision"
          :files="data.attachments"
          :limits="data.attachmentLimits"
          readonly
        />
      </section>
    </template>
  </section>
</template>
