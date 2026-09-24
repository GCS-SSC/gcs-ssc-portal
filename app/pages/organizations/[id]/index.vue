<script setup lang="ts">
import {
  hasAccess,
  permissionLevel,
  subjects,
  accessLevels,
  type PermissionSubject,
  type AccessLevel
} from '~~/shared/utils/permissions'
import type { Organization, Member, Invitation } from '~~/shared/types/api'
const { c, permissionLabel } = useCaseLocale()
definePageMeta({ key: (route) => route.params.id as string })
const route = useRoute()
const { t, date } = useLocale()
const { g } = useGovernmentLocale()
const { user } = usePortalSession()
const message = useApiMessage()
const api = usePortalApi()
const id = String(route.params.id)
const base = `/api/organizations/${encodeURIComponent(id)}`
const tab = ref<'overview' | 'work' | 'funding' | 'members' | 'invitations' | 'settings'>(
  'overview'
)
const organization = ref<Organization | null>(null)
const members = ref<Member[]>([])
const invitations = ref<Invitation[]>([])
const loading = ref(true)
const loadError = ref('')
const error = ref('')
const success = ref('')
const busy = ref(false)
const name = ref('')
const description = ref('')
const inviteName = ref('')
const inviteEmail = ref('')
const invitationUrl = ref('')
const invitationExpiry = ref('')
const copied = ref(false)
const newOwner = ref('')
const confirmation = ref<{ text: string; action: () => Promise<void> } | null>(null)
const canAdmin = computed(() => organization.value?.permissions.includes('admin') ?? false)
const isOwner = computed(() => organization.value?.ownerId === user.value?.id)
const transferOptions = computed(() => [
  { value: '', label: t('selectPerson') },
  ...members.value
    .filter((member) => !member.isOwner)
    .map((member) => ({
      value: member.userId,
      label: `${member.name} (${member.email})`
    }))
])
useHead(() => ({ title: organization.value?.name || t('organizations') }))
const load = async () => {
  loadError.value = ''
  try {
    const response = await api<{ organization: Organization }>(base)
    const admin = response.organization.permissions.includes('admin')
    const [people, invites] = await Promise.all([
      api<{ members: Member[] }>(`${base}/members`),
      admin
        ? api<{ invitations: Invitation[] }>(`${base}/invitations`)
        : Promise.resolve({ invitations: [] })
    ])
    organization.value = response.organization
    members.value = people.members
    invitations.value = invites.invitations
    name.value = response.organization.name
    description.value = response.organization.description
    if (!admin && ['invitations', 'settings'].includes(tab.value)) tab.value = 'overview'
  } catch (failure) {
    loadError.value = message(failure)
  } finally {
    loading.value = false
  }
}
const perform = async (action: () => Promise<unknown>, successMessage: string) => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await action()
    success.value = successMessage
    confirmation.value = null
    await load()
  } catch (failure) {
    error.value = message(failure)
  } finally {
    busy.value = false
  }
}
const save = () =>
  perform(
    () =>
      api<unknown>(base, {
        method: 'PATCH',
        body: { name: name.value, description: description.value }
      }),
    t('detailsSaved')
  )
const invite = () =>
  perform(async () => {
    const response = await api<{ invitation: Invitation; url: string }>(`${base}/invitations`, {
      method: 'POST',
      body: { email: inviteEmail.value, name: inviteName.value }
    })
    invitationUrl.value = response.url
    invitationExpiry.value = response.invitation.expiresAt
    copied.value = false
    inviteName.value = ''
    inviteEmail.value = ''
  }, t('invitationCreated'))
const copy = async () => {
  try {
    await navigator.clipboard.writeText(invitationUrl.value)
    copied.value = true
  } catch {
    document.getElementById('invitation-link')?.focus()
  }
}
const requestPermission = (member: Member) => {
  const hasAdmin = member.permissions.includes('admin')
  confirmation.value = {
    text: t(hasAdmin ? 'removeAdminConfirm' : 'adminConfirm'),
    action: () =>
      perform(
        () =>
          api<unknown>(`${base}/members/${encodeURIComponent(member.userId)}`, {
            method: 'PATCH',
            body: {
              permissions: hasAdmin
                ? member.permissions.filter((permission) => permission !== 'admin')
                : [...member.permissions, 'admin']
            }
          }),
        t('permissionsSaved')
      )
  }
}
const setPermission = (member: Member, subject: PermissionSubject, level: string) => {
  const permissions = member.permissions.filter(
    (permission) => !permission.startsWith(`${subject}:`)
  )
  if (level) permissions.push(`${subject}:${level as AccessLevel}`)
  return perform(
    () =>
      api<unknown>(`${base}/members/${encodeURIComponent(member.userId)}`, {
        method: 'PATCH',
        body: { permissions }
      }),
    t('permissionsSaved')
  )
}
const revoke = (invitation: Invitation) => {
  confirmation.value = {
    text: t('revokeConfirm'),
    action: () =>
      perform(
        () =>
          api<unknown>(`${base}/invitations/${invitation.id}`, {
            method: 'DELETE'
          }),
        t('invitationRevoked')
      )
  }
}
const transfer = () => {
  if (!newOwner.value) return
  const userId = newOwner.value
  confirmation.value = {
    text: t('transferConfirm'),
    action: () =>
      perform(
        () =>
          api<unknown>(`${base}/transfer`, {
            method: 'POST',
            body: { userId }
          }),
        t('ownershipTransferred')
      )
  }
}
watch(confirmation, async (value) => {
  if (!value) return
  await nextTick()
  document.getElementById('confirm-change')?.focus()
})
watch(tab, () => {
  confirmation.value = null
  error.value = ''
  success.value = ''
  invitationUrl.value = ''
})
await load()
</script>
<template>
  <section>
    <PortalLink to="/organizations">{{ t('backOrganizations') }}</PortalLink>
    <p v-if="loading" role="status">{{ t('loading') }}</p>
    <PortalNotice v-else-if="loadError" variant="error"
      >{{ loadError }}
      <PortalButton variant="secondary" @click="load">{{ t('retry') }}</PortalButton></PortalNotice
    >
    <template v-else-if="organization">
      <div class="entity-heading">
        <h1>{{ organization.name }}</h1>
      </div>
      <div class="workspace">
        <nav class="workspace-nav" :aria-label="t('manageOrganization')">
          <PortalButton
            variant="link"
            :aria-current="tab === 'overview' ? 'page' : undefined"
            @click="tab = 'overview'"
            >{{ t('overview') }}</PortalButton
          >
          <PortalButton
            v-if="
              subjects.some(
                (subject) =>
                  subject !== 'application' && hasAccess(organization?.permissions ?? [], subject)
              )
            "
            variant="link"
            :aria-current="tab === 'work' ? 'page' : undefined"
            @click="tab = 'work'"
            >{{ c('cases') }}</PortalButton
          >
          <PortalButton
            v-if="hasAccess(organization.permissions, 'application')"
            variant="link"
            :aria-current="tab === 'funding' ? 'page' : undefined"
            @click="tab = 'funding'"
            >{{ g('apply') }}</PortalButton
          >
          <PortalButton
            v-for="item in canAdmin
              ? (['members', 'invitations', 'settings'] as const)
              : (['members'] as const)"
            :key="item"
            variant="link"
            :aria-current="tab === item ? 'page' : undefined"
            @click="tab = item"
            >{{ t(item) }}</PortalButton
          >
        </nav>
        <div class="workspace-body">
          <PortalNotice v-if="error" variant="error" :title="t('errorTitle')">{{
            error
          }}</PortalNotice>
          <PortalNotice v-if="success" variant="success">{{ success }}</PortalNotice>
          <section
            v-if="confirmation"
            id="confirm-change"
            tabindex="-1"
            class="confirmation"
            role="region"
            :aria-label="t('confirmTitle')"
            aria-live="polite"
          >
            <h3>{{ t('confirmTitle') }}</h3>
            <p>{{ confirmation.text }}</p>
            <div class="form-actions">
              <PortalButton :disabled="busy" @click="confirmation.action">{{
                t('confirm')
              }}</PortalButton
              ><PortalButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
                t('cancel')
              }}</PortalButton>
            </div>
          </section>
          <OrganizationWork v-if="tab === 'work'" :organization-id="id" embedded />
          <OrganizationFunding v-if="tab === 'funding'" :organization-id="id" embedded />
          <template v-if="tab === 'overview'">
            <h2>{{ t('overview') }}</h2>
            <dl class="detail-list">
              <div>
                <dt>{{ t('organizationName') }}</dt>
                <dd>{{ organization.name }}</dd>
              </div>
              <div v-if="organization.description">
                <dt>{{ t('organizationDescription') }}</dt>
                <dd>{{ organization.description }}</dd>
              </div>
              <div>
                <dt>{{ t('organizationId') }}</dt>
                <dd class="identifier">{{ organization.id }}</dd>
              </div>
              <div>
                <dt>{{ t('created') }}</dt>
                <dd>{{ date(organization.createdAt) }}</dd>
              </div>
              <div>
                <dt>{{ t('owner') }}</dt>
                <dd>{{ members.find((member) => member.isOwner)?.name }}</dd>
              </div>
            </dl>
            <section class="content-section">
              <h2>{{ t('yourAccess') }}</h2>
              <p>{{ t('accessIntro') }}</p>
              <p>
                {{ t(isOwner ? 'ownerText' : canAdmin ? 'adminText' : 'userText') }}
              </p>
            </section>
          </template>
          <template v-if="tab === 'members'">
            <h2>{{ t('members') }}</h2>
            <p>{{ t('teamIntro') }}</p>
            <p v-if="canAdmin">{{ c('permissionsHint') }}</p>
            <div class="table-scroll">
              <table>
                <caption class="sr-only">
                  {{
                    t('members')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('fullName') }}</th>
                    <th scope="col">{{ t('permissions') }}</th>
                    <th v-if="canAdmin" scope="col">{{ t('actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="member in members" :key="member.userId">
                    <td>
                      <strong>{{ member.name }}</strong
                      ><span class="table-secondary">{{ member.email }}</span>
                    </td>
                    <td>
                      <div class="badges">
                        <PortalBadge v-if="member.isOwner" tone="success">{{
                          t('owner')
                        }}</PortalBadge
                        ><PortalBadge v-for="permission in member.permissions" :key="permission">{{
                          permissionLabel(permission)
                        }}</PortalBadge>
                      </div>
                    </td>
                    <td v-if="canAdmin">
                      <span v-if="member.isOwner" class="muted">{{ t('ownerPermissionHint') }}</span
                      ><PortalButton
                        v-else
                        variant="link"
                        :disabled="busy"
                        @click="requestPermission(member)"
                        >{{
                          t(member.permissions.includes('admin') ? 'removeAdmin' : 'grantAdmin')
                        }}</PortalButton
                      >
                      <PortalSelect
                        v-for="subject in subjects"
                        :id="`permission-${member.userId}-${subject}`"
                        :key="subject"
                        :label="c(subject)"
                        :model-value="permissionLevel(member.permissions, subject)"
                        :options="[
                          { value: '', label: c('none') },
                          ...accessLevels.map((value) => ({ value, label: c(value) }))
                        ]"
                        :disabled="busy"
                        @update:model-value="setPermission(member, subject, $event)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template v-if="tab === 'invitations' && canAdmin">
            <h2>{{ t('invitePerson') }}</h2>
            <p>{{ t('inviteIntro') }}</p>
            <form class="portal-form" @submit.prevent="invite">
              <PortalInput
                id="invite-email"
                v-model="inviteEmail"
                :label="t('email')"
                type="email"
                :hint="t('inviteEmailHint')"
                :maxlength="254"
                required
              /><PortalInput
                id="invite-name"
                v-model="inviteName"
                :label="t('fullName')"
                :hint="t('inviteNameHint')"
                :maxlength="120"
              />
              <div class="form-actions">
                <PortalButton type="submit" :disabled="busy" :loading="busy">{{
                  t('createInvitation')
                }}</PortalButton>
              </div>
            </form>
            <section v-if="invitationUrl" class="invitation-result" aria-live="polite">
              <h3>{{ t('invitationCreated') }}</h3>
              <p>{{ t('shareLink') }}</p>
              <PortalInput
                id="invitation-link"
                :model-value="invitationUrl"
                :label="t('invitationLink')"
                readonly
              />
              <p class="metadata">{{ t('expires') }} {{ date(invitationExpiry) }}</p>
              <PortalButton variant="secondary" @click="copy">{{
                copied ? t('copied') : t('copyLink')
              }}</PortalButton>
            </section>
            <section class="content-section">
              <h2>{{ t('pendingInvitations') }}</h2>
              <p v-if="!invitations.length">{{ t('noInvitations') }}</p>
              <div v-else class="table-scroll">
                <table>
                  <caption class="sr-only">
                    {{
                      t('invitations')
                    }}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{{ t('invitedPerson') }}</th>
                      <th scope="col">{{ t('status') }}</th>
                      <th scope="col">{{ t('expires') }}</th>
                      <th scope="col">{{ t('actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="invitation in invitations" :key="invitation.id">
                      <td>
                        {{ invitation.email
                        }}<span v-if="invitation.name" class="table-secondary">{{
                          invitation.name
                        }}</span>
                      </td>
                      <td>
                        <PortalBadge
                          :tone="invitation.status === 'pending' ? 'warning' : 'neutral'"
                          >{{ t(invitation.status) }}</PortalBadge
                        >
                      </td>
                      <td>{{ date(invitation.expiresAt) }}</td>
                      <td>
                        <PortalButton
                          v-if="invitation.status === 'pending'"
                          variant="link"
                          :disabled="busy"
                          @click="revoke(invitation)"
                          >{{ t('revoke') }}</PortalButton
                        >
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
          <template v-if="tab === 'settings' && canAdmin">
            <h2>{{ t('details') }}</h2>
            <form class="portal-form" @submit.prevent="save">
              <PortalInput
                id="edit-name"
                v-model="name"
                :label="t('organizationName')"
                :minlength="2"
                :hint="t('organizationNameHint')"
                :maxlength="120"
                required
              /><PortalInput
                id="edit-description"
                v-model="description"
                :label="t('organizationDescription')"
                :hint="t('organizationDescriptionHint')"
                :maxlength="2000"
              />
              <div class="form-actions">
                <PortalButton type="submit" :disabled="busy" :loading="busy">{{
                  t('saveChanges')
                }}</PortalButton>
              </div>
            </form>
            <section v-if="isOwner" class="content-section">
              <h2>{{ t('transferOwnership') }}</h2>
              <p>{{ t('transferIntro') }}</p>
              <p v-if="transferOptions.length === 1">
                {{ t('noTransferMembers') }}
              </p>
              <form v-else class="portal-form" @submit.prevent="transfer">
                <PortalSelect
                  id="new-owner"
                  v-model="newOwner"
                  :label="t('newOwner')"
                  :options="transferOptions"
                  required
                />
                <div class="form-actions">
                  <PortalButton type="submit" variant="secondary" :disabled="busy || !newOwner">{{
                    t('transferOwnership')
                  }}</PortalButton>
                </div>
              </form>
            </section>
          </template>
        </div>
      </div>
    </template>
  </section>
</template>
