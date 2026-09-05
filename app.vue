<script setup lang="ts">
const { themeMode, hydrateTheme } = useTheme();
useHead(() => ({ htmlAttrs: { "data-theme": themeMode.value } }));
onMounted(hydrateTheme);
</script>

<template>
  <NuxtPage />
</template>
