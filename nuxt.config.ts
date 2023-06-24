// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ["~/assets/scss/main.scss"],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/scss/core/_variables.scss";`,
        },
      },
    },
  },
  modules: ["@nuxtjs/eslint-module"],
  devtools: { enabled: true },
});
