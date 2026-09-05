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
  "change-folder": [];
}>();

const itemClass =
  "cursor-pointer select-none rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-zinc-100 data-[disabled]:opacity-50 dark:data-[highlighted]:bg-zinc-900";
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      class="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:hover:bg-zinc-900"
      aria-label="More actions"
    >
      ⋯
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="z-50 min-w-56 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
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
        <DropdownMenuSeparator class="my-1.5 h-px bg-zinc-200 dark:bg-zinc-800" />
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
