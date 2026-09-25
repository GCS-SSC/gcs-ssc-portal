<script setup lang="ts">
const id = String(useRoute().params.organizationId)
await navigateTo(`/organizations/${encodeURIComponent(id)}?section=funding`, { replace: true })
</script>
<template><div /></template>
