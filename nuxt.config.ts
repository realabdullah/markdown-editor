import { defineNuxtConfig } from "nuxt/config"
import { themeBootScript } from "./utils/themeBoot"

export default defineNuxtConfig({
  compatibilityDate: "2026-04-15",
  devtools: { enabled: false },
  ssr: false,
  css: ["~/assets/css/tailwind.css"],
  modules: ["@nuxtjs/tailwindcss"],
  imports: {
    // Silence duplicate auto-import warnings from Nuxt/Nitro internals.
    warn: () => {},
  },
  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "reka-ui",
        "@codemirror/state",
        "@codemirror/view",
        "@codemirror/commands",
        "@codemirror/lang-markdown",
        "markdown-it",
        "isomorphic-dompurify",
        "idb",
      ],
    },
  },
  app: {
    head: {
      title: "Modern Minimalistic Markdown Editor",
      script: [
        // Picks the theme before the first paint; see utils/themeBoot.ts.
        { innerHTML: themeBootScript(), tagPosition: "head" },
      ],
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "A fast privacy-first markdown editor with real-time preview and offline support.",
        },
      ],
    },
  },
})
