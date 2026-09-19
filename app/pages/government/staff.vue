<script setup lang="ts">
import type { Agency, GovernmentStaff, StaffInvitation } from '~~/shared/types/government'
const { g, localized } = useGovernmentLocale()
const { date, t } = useLocale()
const api = usePortalApi(),
  message = useApiMessage()
const { busy, error, success, perform } = useGovernmentAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData('government-staff', async () => {
  const [staff, invitations, agencies] = await Promise.all([
    api<GovernmentStaff[]>('/api/government/staff'),
    api<StaffInvitation[]>('/api/government/staff-invitations'),
    api<{ agencies: Agency[] }>('/api/government/agencies')
  ])
  return { staff, invitations, agencies: agencies.agencies }
})
const name = ref(''),
  email = ref(''),
  agencyId = ref(''),
  invitationUrl = ref('')
const assignments = reactive<Record<string, string>>({})
const confirmation = ref<GovernmentStaff | null>(null)
const agencyOptions = computed(() => [
  { value: '', label: g('noAssignment') },
  ...(data.value?.agencies ?? []).map((a) => ({ value: a.id, label: localized(a) }))
])
const invite = () =>
  perform(async () => {
    const result = await api<{ url: string }>('/api/government/staff-invitations', {
      method: 'POST',
      body: { name: name.value, email: email.value, agencyId: agencyId.value || null }
    })
    invitationUrl.value = result.url
    name.value = ''
    email.value = ''
    await refresh()
  })
const access = (staff: GovernmentStaff, agencyIds: string[]) =>
  perform(async () => {
    await api(`/api/government/staff/${encodeURIComponent(staff.userId)}/access`, {
      method: 'PATCH',
      body: { agencyIds }
    })
    assignments[staff.userId] = ''
    await refresh()
  })
const status = (staff: GovernmentStaff) =>
  perform(async () => {
    await api(`/api/government/staff/${encodeURIComponent(staff.userId)}/status`, {
      method: 'PATCH',
      body: { active: !staff.active }
    })
    confirmation.value = null
    await refresh()
  })
const revoke = (id: string) =>
  perform(async () => {
    await api(`/api/government/staff-invitations/${id}`, { method: 'DELETE' })
    invitationUrl.value = ''
    await refresh()
  })
useHead(() => ({ title: g('staff') }))
</script>
<template>
  <section>
    <ThemeLink to="/government">{{ g('back') }}</ThemeLink>
    <h1>{{ g('staff') }}</h1>
    <p class="lead">{{ g('staffIntro') }}</p>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    >
    <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
    <ThemeNotice v-if="success" variant="success">{{ success }}</ThemeNotice>
    <template v-if="data">
      <section v-if="confirmation" class="confirmation" aria-live="polite">
        <h2>{{ g('confirmChange') }}</h2>
        <p>{{ g('staffStatusConfirm') }} {{ confirmation.name }}</p>
        <div class="form-actions">
          <ThemeButton :disabled="busy" @click="status(confirmation)">{{
            g('confirm')
          }}</ThemeButton
          ><ThemeButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
            g('cancel')
          }}</ThemeButton>
        </div>
      </section>
      <section v-for="person in data.staff" :key="person.userId" class="content-section">
        <h2>{{ person.name }}</h2>
        <p>{{ person.email }}</p>
        <ThemeBadge>{{
          g(person.role === 'root' ? 'root' : person.active ? 'active' : 'inactive')
        }}</ThemeBadge>
        <template v-if="person.role !== 'root'">
          <ThemeButton variant="link" :disabled="busy" @click="confirmation = person">{{
            g(person.active ? 'deactivate' : 'reactivate')
          }}</ThemeButton>
          <h3>{{ g('access') }}</h3>
          <p v-if="!person.agencyIds.length">{{ g('noAssignment') }}</p>
          <ul v-else>
            <li v-for="assigned in person.agencyIds" :key="assigned">
              {{ localized(data.agencies.find((a) => a.id === assigned)!) }}
              <ThemeButton
                variant="link"
                :disabled="busy"
                @click="
                  access(
                    person,
                    person.agencyIds.filter((id) => id !== assigned)
                  )
                "
                >{{ g('removeAccess') }}</ThemeButton
              >
            </li>
          </ul>
          <form
            class="portal-form"
            @submit.prevent="access(person, [...person.agencyIds, assignments[person.userId]!])"
          >
            <ThemeSelect
              :id="`access-${person.userId}`"
              :model-value="assignments[person.userId] || ''"
              :label="g('agency')"
              :options="agencyOptions.filter((a) => !person.agencyIds.includes(a.value))"
              @update:model-value="assignments[person.userId] = $event"
            />
            <div class="form-actions">
              <ThemeButton
                type="submit"
                variant="secondary"
                :disabled="busy || !assignments[person.userId]"
                >{{ g('addAccess') }}</ThemeButton
              >
            </div>
          </form>
        </template>
      </section>
      <section class="content-section">
        <h2>{{ g('inviteStaff') }}</h2>
        <form class="portal-form" @submit.prevent="invite">
          <ThemeInput id="staff-name" v-model="name" :label="g('name')" :maxlength="120" required />
          <ThemeInput
            id="staff-email"
            v-model="email"
            :label="g('email')"
            type="email"
            :maxlength="254"
            required
          />
          <ThemeSelect
            id="staff-agency"
            v-model="agencyId"
            :label="g('agency')"
            :options="agencyOptions"
          />
          <div class="form-actions">
            <ThemeButton type="submit" :disabled="busy" :loading="busy">{{
              g('invite')
            }}</ThemeButton>
          </div>
        </form>
        <section v-if="invitationUrl" class="invitation-result" aria-live="polite">
          <p>{{ g('shareInvitation') }}</p>
          <ThemeInput
            id="staff-invitation-link"
            :model-value="invitationUrl"
            :label="g('invitationLink')"
            readonly
          />
        </section>
      </section>
      <section class="content-section">
        <h2>{{ g('invitations') }}</h2>
        <p v-if="!data.invitations.length">{{ g('empty') }}</p>
        <div v-else class="table-scroll">
          <table>
            <caption class="sr-only">
              {{
                g('invitations')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ g('email') }}</th>
                <th scope="col">{{ g('status') }}</th>
                <th scope="col">{{ g('expires') }}</th>
                <th scope="col">{{ g('revoke') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invitation in data.invitations" :key="invitation.id">
                <td>{{ invitation.email }}</td>
                <td>{{ g(invitation.status) }}</td>
                <td>{{ date(invitation.expiresAt) }}</td>
                <td>
                  <ThemeButton
                    v-if="invitation.status === 'pending'"
                    variant="link"
                    :disabled="busy"
                    @click="revoke(invitation.id)"
                    >{{ g('revoke') }}</ThemeButton
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>
