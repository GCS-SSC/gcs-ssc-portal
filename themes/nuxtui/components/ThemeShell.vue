<script setup lang="ts">
import signatureEn from '../assets/sig-blk-en.svg'
import signatureFr from '../assets/sig-blk-fr.svg'
import wordmarkEn from '../assets/wmms-spl-en.svg'
import wordmarkFr from '../assets/wmms-spl-fr.svg'
import type { ThemeShellProps } from '../../../shared/types/theme'
const props = defineProps<ThemeShellProps>()
const emit = defineEmits<{ signout: []; locale: [value: 'en' | 'fr'] }>()
provide('portal-theme-locale', toRef(props, 'locale'))
const copy = computed(() =>
  props.locale === 'fr'
    ? {
        skip: 'Passer au contenu principal',
        portal: 'Portail des organisations',
        home: 'Accueil',
        organizations: 'Organisations',
        signout: 'Se déconnecter',
        navigation: 'Navigation principale',
        service: 'GCS–SSC',
        footer: 'Gérer votre organisation et les accès à vos services.',
        canada: 'Gouvernement du Canada'
      }
    : {
        skip: 'Skip to main content',
        portal: 'Organization portal',
        home: 'Home',
        organizations: 'Organizations',
        signout: 'Sign out',
        navigation: 'Main navigation',
        service: 'GCS–SSC',
        footer: 'Manage your organization and access to your services.',
        canada: 'Government of Canada'
      }
)
</script>

<template>
  <div class="nuxt-portal-shell">
    <a class="portal-skip" href="#main-content">{{ copy.skip }}</a>
    <header class="portal-header">
      <div class="portal-container portal-signature-row">
        <ULink to="/" class="portal-signature" :aria-label="copy.canada">
          <img
            :src="locale === 'fr' ? signatureFr : signatureEn"
            :alt="copy.canada"
            width="320"
            height="31"
          />
        </ULink>
        <UButton
          color="primary"
          variant="link"
          type="button"
          class="portal-language"
          :lang="locale === 'en' ? 'fr' : 'en'"
          @click="emit('locale', locale === 'en' ? 'fr' : 'en')"
          >{{ locale === 'en' ? 'Français' : 'English' }}</UButton
        >
      </div>
      <div class="portal-container portal-brand">
        <ULink to="/"
          >GCS–SSC <span>{{ portalTitle || copy.portal }}</span></ULink
        >
      </div>
      <nav class="portal-navigation" :aria-label="copy.navigation">
        <div class="portal-container portal-navigation-inner">
          <ULink to="/" :aria-current="currentPath === '/' ? 'page' : undefined">{{
            copy.home
          }}</ULink>
          <ULink
            v-for="item in navigation ??
            (signedIn ? [{ to: '/organizations', label: copy.organizations }] : [])"
            :key="item.to"
            :to="item.to"
            :aria-current="currentPath === item.to ? 'page' : undefined"
            >{{ item.label }}</ULink
          >
          <div v-if="signedIn" class="portal-account">
            <span>{{ userName }}</span
            ><UButton type="button" variant="link" color="neutral" @click="emit('signout')">{{
              copy.signout
            }}</UButton>
          </div>
        </div>
      </nav>
    </header>
    <main id="main-content" class="portal-container portal-main" tabindex="-1"><slot /></main>
    <footer class="portal-footer">
      <div class="portal-container portal-footer-inner">
        <div>
          <strong>{{ copy.service }}</strong>
          <p>{{ copy.footer }}</p>
        </div>
        <img
          class="portal-wordmark"
          :src="locale === 'fr' ? wordmarkFr : wordmarkEn"
          :alt="copy.canada"
          width="132"
          height="32"
        />
      </div>
    </footer>
  </div>
</template>
