<script setup lang="ts">
import {
  GcdsHeader,
  GcdsFooter,
  GcdsLangToggle,
  GcdsTopNav,
  GcdsNavLink,
  GcdsNavGroup,
  GcdsButton
} from '@gcds-core/components-vue'
import type { PortalShellProps } from '../../../shared/types/ui'

const props = defineProps<PortalShellProps>()
provide(
  'portal-locale',
  computed(() => props.locale)
)
const emit = defineEmits<{ signout: []; locale: [locale: 'en' | 'fr'] }>()
const text = computed(() =>
  props.locale === 'fr'
    ? {
        portal: 'Portail GCS-SSC',
        account: 'Compte',
        organizations: 'Organisations',
        signout: 'Se déconnecter'
      }
    : {
        portal: 'GCS-SSC portal',
        account: 'Account',
        organizations: 'Organizations',
        signout: 'Sign out'
      }
)
</script>

<template>
  <div class="gc-shell" :lang="locale">
    <GcdsHeader :lang-href="currentPath || '/'" :lang="locale" skip-to-href="#main-content">
      <!-- Native web-component slot, not a Vue named slot. -->
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <GcdsLangToggle
        slot="toggle"
        :lang="locale"
        :href="currentPath || '/'"
        @click.prevent="emit('locale', locale === 'en' ? 'fr' : 'en')"
      />
      <GcdsTopNav slot="menu" :label="text.portal" alignment="end" :lang="locale">
        <GcdsNavLink slot="home" href="/" :current="currentPath === '/'">
          {{ portalTitle || text.portal }}
        </GcdsNavLink>
        <GcdsNavGroup
          v-if="signedIn"
          :menu-label="text.account"
          :open-trigger="userName || text.account"
          :close-trigger="userName || text.account"
          :lang="locale"
        >
          <GcdsNavLink
            v-for="item in navigation ?? [{ to: '/organizations', label: text.organizations }]"
            :key="item.to"
            :href="item.to"
            :current="currentPath === item.to"
            >{{ item.label }}</GcdsNavLink
          >
        </GcdsNavGroup>
        <GcdsButton v-if="signedIn" class="gc-nav-signout" @gcds-click="emit('signout')">
          {{ text.signout }}
        </GcdsButton>
      </GcdsTopNav>
      <!-- eslint-enable vue/no-deprecated-slot-attribute -->
    </GcdsHeader>
    <main id="main-content" class="gc-main" tabindex="-1"><slot /></main>
    <GcdsFooter :lang="locale" display="compact" />
  </div>
</template>
