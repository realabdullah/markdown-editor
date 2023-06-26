<script lang="ts" setup>
useHead({
  title: 'Markdown Playground',
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
    },
    {
      name: 'description',
      content: 'Home page of Markdown Playground',
    },
  ],
});

const { isPreviewActive, docs } = storeToRefs(useStore());
const { setTheme } = useStore();

const isMenuOpen = ref(false);
const isDeleteModalOpen = ref(false);

const toggleDeleteModal = (value: boolean) => isDeleteModalOpen.value = value;

const toggleMenu = (value: boolean) => isMenuOpen.value = value;

const theme = useCookie('theme');

onBeforeMount(async () => {
  if (theme.value) setTheme(theme.value);
  else window.matchMedia('(prefers-color-scheme: dark)').matches && setTheme("dark");

  // get all docs
  const { getDocs } = useMdDocs();
  const data = await getDocs();
  if (data) {
    data.sort((a: Doc, b: Doc) => new Date(b.created).getTime() - new Date(a.created).getTime());
    docs.value = data;
  }
});
</script>

<template>
  <div class="home d-flex">
    <BaseSideBar class="sidebar" v-show="isMenuOpen" />
    <div class="home__container">
      <BaseHeader @toggle-menu="toggleMenu" @toggle-delete-modal="toggleDeleteModal(true)" />
      <div class="home__container-main d-grid" :class="{ main: !isPreviewActive }">
        <PlaygroundEditor v-show="!isPreviewActive" />
        <hr v-if="!isPreviewActive">
        <PlaygroundPreview :class="isPreviewActive ? 'preview-pane-active' : 'preview-pane-inactive'" />
      </div>
    </div>
  </div>

  <DeleteModal v-if="isDeleteModalOpen" @toggle-delete-modal="toggleDeleteModal" />
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

      hr {
        @media (max-width: 768px) {
          display: none !important;
        }
      }

      .preview-pane {
        @media (max-width: 768px) {
          display: block;
        }
      }

      .preview-pane-inactive {
        @media (max-width: 768px) {
          display: none;
        }
      }
    }

    .main {
      grid-template-columns: 50% 1px 50%;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }

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
