<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "reka-ui";

defineProps<{ hasDocument: boolean }>();

const emit = defineEmits<{
  "export-markdown": [];
  "export-html": [];
  "copy-markdown": [];
  "open-settings": [];
  "change-folder": [];
}>();

const itemClass =
  "cursor-pointer select-none rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-raised data-[disabled]:opacity-50";
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      class="rounded-md border border-line-strong px-2.5 py-1.5 text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      aria-label="More actions"
    >
      ⋯
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="z-50 min-w-56 rounded-lg border border-line bg-panel p-1.5 shadow-panel"
        :side-offset="6"
        align="end"
      >
        <DropdownMenuItem
          :class="itemClass"
          :disabled="!hasDocument"
          @select="emit('export-markdown')"
        >
          Download a copy (.md)
        </DropdownMenuItem>
        <DropdownMenuItem
          :class="itemClass"
          :disabled="!hasDocument"
          @select="emit('export-html')"
        >
          Download rendered HTML
        </DropdownMenuItem>
        <DropdownMenuItem
          :class="itemClass"
          :disabled="!hasDocument"
          @select="emit('copy-markdown')"
        >
          Copy Markdown to clipboard
        </DropdownMenuItem>
        <DropdownMenuSeparator class="my-1.5 h-px bg-line" />
        <DropdownMenuItem
          :class="itemClass"
          @select="emit('open-settings')"
        >
          Settings…
        </DropdownMenuItem>
        <DropdownMenuItem
          :class="itemClass"
          @select="emit('change-folder')"
        >
          Change workspace folder…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
