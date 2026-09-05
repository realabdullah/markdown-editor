<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  RadioGroupItem,
  RadioGroupRoot,
} from "reka-ui";
import type { ThemeDefinition, ThemePreference } from "~/types/theme";

const open = defineModel<boolean>("open", { required: true });

const { preference, themeId, themes, setPreference } = useTheme();

const SYSTEM_OPTION = {
  id: "system",
  name: "Match my device",
  description: "Follows the light or dark setting of your operating system.",
} as const;

const lightThemes = computed(() => themes.filter((theme) => theme.appearance === "light"));
const darkThemes = computed(() => themes.filter((theme) => theme.appearance === "dark"));

/**
 * Swatches must show a theme's own colours while a different theme is active,
 * which no token class can do — and Tailwind cannot see a class name composed
 * at runtime either. Inline styles are the only honest option here.
 */
const swatches = (theme: ThemeDefinition) => [
  { label: "Background", value: theme.tokens["surface-app"] },
  { label: "Panel", value: theme.tokens["surface-panel"] },
  { label: "Text", value: theme.tokens.ink },
  { label: "Accent", value: theme.tokens.accent },
];

const choose = (value: string) => setPreference(value as ThemePreference);
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-16 z-50 flex max-h-[calc(100dvh-8rem)] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-panel focus:outline-none"
      >
        <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <DialogTitle class="text-sm font-semibold text-ink">
              Settings
            </DialogTitle>
            <DialogDescription class="mt-1 text-xs text-ink-subtle">
              Choose how the editor looks. Changes apply straight away.
            </DialogDescription>
          </div>
          <DialogClose
            class="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Close settings"
          >
            Done
          </DialogClose>
        </div>

        <div class="min-h-0 overflow-auto px-5 py-4">
          <RadioGroupRoot
            class="flex flex-col gap-5"
            :model-value="preference === 'system' ? 'system' : themeId"
            aria-label="Theme"
            @update:model-value="choose(String($event))"
          >
            <div
              v-for="group in [
                { id: 'system', label: 'Automatic', items: [SYSTEM_OPTION] },
                { id: 'light', label: 'Light', items: lightThemes },
                { id: 'dark', label: 'Dark', items: darkThemes },
              ]"
              :key="group.id"
              role="group"
              :aria-labelledby="`theme-group-${group.id}`"
            >
              <h3
                :id="`theme-group-${group.id}`"
                class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-subtle"
              >
                {{ group.label }}
              </h3>

              <div class="flex flex-col gap-1.5">
                <RadioGroupItem
                  v-for="item in group.items"
                  :key="item.id"
                  :value="item.id"
                  :aria-describedby="`theme-hint-${item.id}`"
                  class="group flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus data-[state=checked]:border-line-strong data-[state=checked]:bg-raised"
                >
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-medium text-ink">{{ item.name }}</span>
                    <span
                      :id="`theme-hint-${item.id}`"
                      class="mt-0.5 block text-xs text-ink-subtle"
                    >{{ item.description }}</span>
                  </span>

                  <span
                    v-if="'tokens' in item"
                    class="flex flex-none items-center gap-1"
                    aria-hidden="true"
                  >
                    <span
                      v-for="swatch in swatches(item)"
                      :key="swatch.label"
                      class="h-4 w-4 rounded-full border border-line"
                      :style="{ backgroundColor: `rgb(${swatch.value})` }"
                    />
                  </span>

                  <!-- A glyph as well as the radio state, so the selection is
                       never carried by colour alone. -->
                  <span class="w-4 flex-none text-center text-sm text-ink group-data-[state=unchecked]:invisible">✓</span>
                </RadioGroupItem>
              </div>
            </div>
          </RadioGroupRoot>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
