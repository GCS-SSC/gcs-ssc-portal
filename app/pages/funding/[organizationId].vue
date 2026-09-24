<script setup lang="ts">
definePageMeta({ key: (route) => String(route.params.organizationId) })
const id = String(useRoute().params.organizationId)
const { g } = useGovernmentLocale()
useHead(() => ({ title: g('apply') }))
</script>
<template>
  <OrganizationFunding :organization-id="id" />
</template>
