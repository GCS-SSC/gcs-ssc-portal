<script setup lang="ts">
definePageMeta({ key: (route) => route.fullPath })
const id = String(useRoute().params.id)
</script>
<template>
  <OrganizationWork :organization-id="id" />
</template>
