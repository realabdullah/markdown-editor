<script lang="ts" setup>
const { setTheme } = useStore();

const isMenuOpen = ref(false);
const isDeleteModalOpen = ref(false);

const toggleDeleteModal = (value: boolean) => isDeleteModalOpen.value = value;

const toggleMenu = (value: boolean) => isMenuOpen.value = value;

const theme = useCookie('theme');

onBeforeMount(() => {
  if (theme.value) setTheme(theme.value);
  else window.matchMedia('(prefers-color-scheme: dark)').matches && setTheme("dark");
});
</script>

<template>
  <div class="home d-flex">
    <BaseSideBar class="sidebar" v-show="isMenuOpen" />
    <div class="home__container">
      <BaseHeader @toggle-menu="toggleMenu" @toggle-delete-modal="toggleDeleteModal(true)" />
      <div class="home__container-main d-grid">
        <PlaygroundEditor />
        <hr>
        <PlaygroundPreview />
      </div>
    </div>
  </div>

  <DeleteModal v-if="isDeleteModalOpen" @toggle-delete-modal="toggleDeleteModal(false)" />
</template>

<style lang="scss" scoped>
.home {
  height: 100vh;

  .sidebar {
    animation: slide-right 0.3s ease-out both;
  }

  &__container {
    width: 100%;
    height: 100%;
    overflow: hidden;

    &-main {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: var(--bg-color);
      color: var(--text-color);
      padding-bottom: 3rem;
      
      grid-template-columns: 50% 1px 50%;

      hr {
        background-color: $col-lightGrayShade;
      }
        
    }
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
