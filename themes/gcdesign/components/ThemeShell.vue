<script setup lang="ts">
import { GcdsHeader, GcdsFooter } from '@gcds-core/components-vue'
import type { ThemeShellProps } from '../../../shared/types/theme'

const props = defineProps<ThemeShellProps>()
provide(
  'portal-theme-locale',
  computed(() => props.locale)
)
const emit = defineEmits<{ signout: []; locale: [locale: 'en' | 'fr'] }>()
const text = computed(() =>
  props.locale === 'fr'
    ? {
        portal: 'Portail GCS-SSC',
        home: 'Accueil',
        organizations: 'Organisations',
        signout: 'Se déconnecter',
        nav: 'Navigation du portail'
      }
    : {
        portal: 'GCS-SSC portal',
        home: 'Home',
        organizations: 'Organizations',
        signout: 'Sign out',
        nav: 'Portal navigation'
      }
)
</script>

<template>
  <div class="gc-shell" :lang="locale">
    <GcdsHeader :lang-href="currentPath || '/'" :lang="locale" skip-to-href="#main-content">
      <!-- Native web-component slot, not a Vue named slot. -->
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <button
        slot="toggle"
        type="button"
        class="gc-language"
        :lang="locale === 'en' ? 'fr' : 'en'"
        @click="emit('locale', locale === 'en' ? 'fr' : 'en')"
      >
        {{ locale === 'en' ? 'Français' : 'English' }}
      </button>
      <!-- eslint-enable vue/no-deprecated-slot-attribute -->
    </GcdsHeader>
    <div class="gc-portal-bar">
      <div class="gc-portal-inner">
        <NuxtLink class="gc-portal-brand" to="/">{{ portalTitle || text.portal }}</NuxtLink>
        <nav class="gc-portal-nav" :aria-label="text.nav">
          <NuxtLink to="/" :aria-current="currentPath === '/' ? 'page' : undefined">{{
            text.home
          }}</NuxtLink>
          <NuxtLink
            v-for="item in navigation ??
            (signedIn ? [{ to: '/organizations', label: text.organizations }] : [])"
            :key="item.to"
            :to="item.to"
            :aria-current="currentPath === item.to ? 'page' : undefined"
            >{{ item.label }}</NuxtLink
          >
          <span v-if="signedIn && userName" class="gc-user-name">{{ userName }}</span>
          <button v-if="signedIn" type="button" @click="emit('signout')">{{ text.signout }}</button>
        </nav>
      </div>
    </div>
    <main id="main-content" class="gc-main" tabindex="-1"><slot /></main>
    <GcdsFooter :lang="locale" display="compact" />
  </div>
</template>
