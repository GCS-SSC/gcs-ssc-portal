<script setup lang="ts">
const id = String(useRoute().params.id)
await navigateTo(`/organizations/${encodeURIComponent(id)}?section=agreements`, { replace: true })
</script>
<template><div /></template>
