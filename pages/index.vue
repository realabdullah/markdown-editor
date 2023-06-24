<script lang="ts" setup>
const isMenuOpen = ref(false);

const toggleMenu = (value: boolean) => isMenuOpen.value = value;
</script>

<template>
  <div class="home d-flex">
    <BaseSideBar class="sidebar" v-show="isMenuOpen" />
    <BaseHeader @toggle-menu="toggleMenu" />
  </div>
</template>

<style lang="scss" scoped>
.home {
  height: 100vh;

  .sidebar {
    animation: slide-right 0.3s ease-out both;
  }
}

@keyframes slide-right {
  0% {
    transform: translateX(-100px);
  }

  100% {
    transform: translateX(0);
  }
}
</style>
