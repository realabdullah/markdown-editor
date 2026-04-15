import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2026-04-15",
  devtools: { enabled: true },
  ssr: true,
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
        "jspdf",
        "@codemirror/state",
        "@codemirror/view",
        "@codemirror/commands",
        "@codemirror/lang-markdown",
        "markdown-it",
        "dompurify",
        "idb",
      ],
    },
  },
  app: {
    head: {
      title: "Modern Minimalistic Markdown Editor",
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
  nitro: {
    preset: "node-server",
  },
  routeRules: {
    "/": { prerender: true },
  },
});
