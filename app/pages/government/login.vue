<script setup lang="ts">
import LoginPage from '../login.vue'
const { user, government } = usePortalSession()
const { g } = useGovernmentLocale()
</script>
<template>
  <section>
    <template v-if="user && !government">
      <h1>{{ g('accessRequired') }}</h1>
      <p class="lead">{{ g('accessRequiredText') }}</p>
    </template>
    <template v-else-if="government">
      <h1>{{ g('government') }}</h1>
      <ThemeLink to="/government">{{ g('agencies') }}</ThemeLink>
    </template>
    <LoginPage v-else />
  </section>
</template>
