<script setup lang="ts">
// The theme attributes are set before the first paint by the inline boot
// script in nuxt.config.ts. Nothing here may write htmlAttrs for them: the
// head patcher would overwrite that on hydrate and reintroduce the flash.
const { hydrateTheme, disposeTheme } = useTheme();

onMounted(hydrateTheme);
onBeforeUnmount(disposeTheme);
</script>

<template>
  <NuxtPage />
</template>
