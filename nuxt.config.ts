// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ["~/assets/scss/main.scss"],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/scss/core/_variables.scss"; @import "@/assets/scss/utils/_mixins.scss";`,
        },
      },
    },
  },
  imports: {
    dirs: ["store"],
  },
  modules: ["@pinia/nuxt"],
  pinia: {
    autoImports: ["defineStore", "storeToRefs"],
  },
  // devtools: { enabled: true },
});
