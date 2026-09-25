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
const { c, permissionLabel } = useAgreementLocale()
definePageMeta({ key: (route) => route.params.id as string })
const route = useRoute()
const { t, date } = useLocale()
const { g } = useGovernmentLocale()
const { user } = usePortalSession()
const message = useApiMessage()
const api = usePortalApi()
const id = String(route.params.id)
const base = `/api/organizations/${encodeURIComponent(id)}`
const sections = [
  'overview',
  'agreements',
  'funding',
  'members',
  'invitations',
  'settings'
] as const
type Section = (typeof sections)[number]
const tab = computed<Section>({
  get: () =>
    sections.includes(route.query.section as Section)
      ? (route.query.section as Section)
      : 'overview',
  set: (section) => {
    void navigateTo({ path: route.path, query: { ...route.query, section } })
  }
})
const workspaceBody = ref<HTMLElement | null>(null)
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
const editingMemberId = ref<string | null>(null)
const editingMember = computed(() =>
  members.value.find((member) => member.userId === editingMemberId.value)
)
const canAdmin = computed(() => organization.value?.permissions.includes('admin') ?? false)
const workspaceItems = computed(() => {
  const permissions = organization.value?.permissions ?? []
  const items: { section: Section; label: string }[] = [
    { section: 'overview', label: t('overview') }
  ]
  if (subjects.some((subject) => subject !== 'application' && hasAccess(permissions, subject)))
    items.push({ section: 'agreements', label: c('agreements') })
  if (hasAccess(permissions, 'application')) items.push({ section: 'funding', label: g('apply') })
  items.push({ section: 'members', label: t('members') })
  if (canAdmin.value)
    items.push(
      { section: 'invitations', label: t('invitations') },
      { section: 'settings', label: t('settings') }
    )
  return items.map((item) => ({
    ...item,
    to: `${route.path}?section=${item.section}`,
    current: tab.value === item.section
  }))
})
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
    if (!workspaceItems.value.some((item) => item.section === tab.value)) tab.value = 'overview'
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
watch(tab, async () => {
  await nextTick()
  workspaceBody.value?.focus()
  confirmation.value = null
  error.value = ''
  success.value = ''
  invitationUrl.value = ''
  editingMemberId.value = null
})
watch(editingMemberId, async (value) => {
  if (!value) return
  await nextTick()
  document.getElementById('member-permissions')?.focus()
})
await load()
</script>
<template>
  <section>
    <PortalText v-if="loading" role="status">{{ t('loading') }}</PortalText>
    <PortalNotice v-else-if="loadError" variant="error"
      >{{ loadError }}
      <PortalButton variant="secondary" @click="load">{{ t('retry') }}</PortalButton></PortalNotice
    >
    <template v-else-if="organization">
      <div class="entity-heading">
        <PortalHeading tag="h1">{{ organization.name }}</PortalHeading>
      </div>
      <PortalGrid
        class="workspace"
        columns="minmax(0, 1fr)"
        columns-tablet="minmax(0, 1fr) minmax(0, 2.4fr)"
        columns-desktop="minmax(0, 1fr) minmax(0, 3fr)"
        gap="400"
      >
        <div>
          <PortalText class="workspace-mobile-label">{{ t('manageOrganization') }}</PortalText>
          <PortalSideNav :label="t('manageOrganization')" :items="workspaceItems" />
        </div>
        <div
          ref="workspaceBody"
          class="workspace-body"
          tabindex="-1"
          role="region"
          :aria-label="workspaceItems.find((item) => item.current)?.label"
        >
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
            <PortalHeading tag="h3">{{ t('confirmTitle') }}</PortalHeading>
            <PortalText>{{ confirmation.text }}</PortalText>
            <div class="form-actions">
              <PortalButton :disabled="busy" @click="confirmation.action">{{
                t('confirm')
              }}</PortalButton
              ><PortalButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
                t('cancel')
              }}</PortalButton>
            </div>
          </section>
          <OrganizationAgreements v-if="tab === 'agreements'" :organization-id="id" embedded />
          <OrganizationFunding v-if="tab === 'funding'" :organization-id="id" embedded />
          <template v-if="tab === 'overview'">
            <PortalHeading tag="h2" margin-top="0">{{ t('overview') }}</PortalHeading>
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
                <dd>
                  <code class="identifier">{{ organization.id }}</code>
                </dd>
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
          </template>
          <template v-if="tab === 'members'">
            <PortalHeading tag="h2" margin-top="0">{{ t('members') }}</PortalHeading>
            <PortalText>{{ t('teamIntro') }}</PortalText>
            <PortalText v-if="canAdmin">{{ c('permissionsHint') }}</PortalText>
            <div class="table-scroll">
              <PortalTable
                :label="t('members')"
                :rows="members"
                :columns="[
                  { field: 'person', header: t('fullName') },
                  { field: 'permissions', header: t('permissions') },
                  ...(canAdmin ? [{ field: 'actions', header: t('actions') }] : [])
                ]"
              >
                <template #person="{ row: member }">
                  <strong>{{ member.name }}</strong
                  ><span class="table-secondary">{{ member.email }}</span>
                </template>
                <template #permissions="{ row: member }">
                  <strong>{{
                    member.isOwner
                      ? t('owner')
                      : member.permissions.includes('admin')
                        ? t('admin')
                        : t('user')
                  }}</strong>
                  <span
                    v-if="member.permissions.some((permission) => permission.includes(':'))"
                    class="table-secondary"
                    >{{
                      member.permissions
                        .filter((permission) => permission.includes(':'))
                        .map(permissionLabel)
                        .join(' · ')
                    }}</span
                  >
                </template>
                <template #actions="{ row: member }">
                  <PortalButton
                    size="small"
                    variant="secondary"
                    @click="editingMemberId = member.userId"
                    >{{ t('edit')
                    }}<PortalScreenreaderOnly>
                      {{ t('permissions').toLowerCase() }} —
                      {{ member.email }}</PortalScreenreaderOnly
                    ></PortalButton
                  >
                </template>
              </PortalTable>
            </div>
            <section
              v-if="editingMember"
              id="member-permissions"
              class="content-section"
              tabindex="-1"
              :aria-label="`${t('permissions')} — ${editingMember.name}`"
            >
              <PortalHeading tag="h3" margin-top="0"
                >{{ t('editAccess') }} — {{ editingMember.name }}</PortalHeading
              >
              <PortalText v-if="editingMember.isOwner">{{ t('ownerPermissionHint') }}</PortalText>
              <PortalButton
                v-else
                size="small"
                variant="secondary"
                :disabled="busy"
                @click="requestPermission(editingMember)"
                >{{
                  t(editingMember.permissions.includes('admin') ? 'removeAdmin' : 'grantAdmin')
                }}</PortalButton
              >
              <div class="permission-editor">
                <PortalSelect
                  v-for="subject in subjects"
                  :id="`permission-${editingMember.userId}-${subject}`"
                  :key="subject"
                  :label="c(subject)"
                  :model-value="permissionLevel(editingMember.permissions, subject)"
                  :options="[
                    { value: '', label: c('none') },
                    ...accessLevels.map((value) => ({ value, label: c(value) }))
                  ]"
                  :disabled="busy"
                  @update:model-value="setPermission(editingMember!, subject, $event)"
                />
              </div>
              <PortalButton size="small" variant="secondary" @click="editingMemberId = null">{{
                t('cancel')
              }}</PortalButton>
            </section>
          </template>
          <template v-if="tab === 'invitations' && canAdmin">
            <PortalHeading tag="h2" margin-top="0">{{ t('invitePerson') }}</PortalHeading>
            <PortalText>{{ t('inviteIntro') }}</PortalText>
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
              <PortalHeading tag="h3">{{ t('invitationCreated') }}</PortalHeading>
              <PortalText>{{ t('shareLink') }}</PortalText>
              <PortalInput
                id="invitation-link"
                :model-value="invitationUrl"
                :label="t('invitationLink')"
                readonly
              />
              <PortalText class="metadata"
                >{{ t('expires') }} {{ date(invitationExpiry) }}</PortalText
              >
              <PortalButton variant="secondary" @click="copy">{{
                copied ? t('copied') : t('copyLink')
              }}</PortalButton>
            </section>
            <section class="content-section">
              <PortalHeading tag="h2" margin-top="0">{{ t('pendingInvitations') }}</PortalHeading>
              <PortalText v-if="!invitations.length">{{ t('noInvitations') }}</PortalText>
              <div v-else class="table-scroll">
                <PortalTable
                  :label="t('invitations')"
                  :rows="invitations"
                  :columns="[
                    { field: 'person', header: t('invitedPerson') },
                    { field: 'status', header: t('status') },
                    { field: 'expires', header: t('expires') },
                    { field: 'actions', header: t('actions') }
                  ]"
                >
                  <template #person="{ row: invitation }">
                    {{ invitation.email
                    }}<span v-if="invitation.name" class="table-secondary">{{
                      invitation.name
                    }}</span>
                  </template>
                  <template #status="{ row: invitation }">
                    <PortalBadge :tone="invitation.status === 'pending' ? 'warning' : 'neutral'">{{
                      t(invitation.status)
                    }}</PortalBadge>
                  </template>
                  <template #expires="{ row: invitation }">{{
                    date(invitation.expiresAt)
                  }}</template>
                  <template #actions="{ row: invitation }">
                    <PortalButton
                      v-if="invitation.status === 'pending'"
                      variant="secondary"
                      :disabled="busy"
                      @click="revoke(invitation)"
                      >{{ t('revoke')
                      }}<PortalScreenreaderOnly>
                        — {{ invitation.email }}</PortalScreenreaderOnly
                      ></PortalButton
                    >
                  </template>
                </PortalTable>
              </div>
            </section>
          </template>
          <template v-if="tab === 'settings' && canAdmin">
            <PortalHeading tag="h2" margin-top="0">{{ t('details') }}</PortalHeading>
            <form class="portal-form" @submit.prevent="save">
              <PortalInput
                id="edit-name"
                v-model="name"
                :label="t('organizationName')"
                :minlength="2"
                :hint="t('organizationNameHint')"
                :maxlength="120"
                required
              /><PortalTextarea
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
              <PortalHeading tag="h2" margin-top="0">{{ t('transferOwnership') }}</PortalHeading>
              <PortalText>{{ t('transferIntro') }}</PortalText>
              <PortalText v-if="transferOptions.length === 1">
                {{ t('noTransferMembers') }}
              </PortalText>
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
      </PortalGrid>
    </template>
  </section>
</template>
