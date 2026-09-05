<script setup lang="ts">
import type { WorkspaceOutlineItem } from "~/types/workspace";

const props = defineProps<{
  items: WorkspaceOutlineItem[];
  activeId: string;
}>();

defineEmits<{ select: [item: WorkspaceOutlineItem] }>();

const INDENT = ["pl-2", "pl-2", "pl-5", "pl-8", "pl-11", "pl-14", "pl-16"];

const root = ref<HTMLElement | null>(null);

/**
 * Keeps the marked heading visible as the reader scrolls the document. Only the
 * outline itself is scrolled — never the page — and only far enough to bring the
 * entry back into view.
 */
watch(
  () => props.activeId,
  async () => {
    await nextTick();
    const nav = root.value;
    const entry = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !entry) return;

    const bounds = nav.getBoundingClientRect();
    const item = entry.getBoundingClientRect();
    if (item.top < bounds.top) {
      nav.scrollTop += item.top - bounds.top;
    } else if (item.bottom > bounds.bottom) {
      nav.scrollTop += item.bottom - bounds.bottom;
    }
  },
);
</script>

<template>
  <nav
    ref="root"
    class="min-h-0 overflow-auto p-2"
    aria-label="Document outline"
  >
    <p
      v-if="!items.length"
      class="px-2 py-1 text-sm text-ink-subtle"
    >
      No headings yet.
    </p>
    <ul
      v-else
      class="space-y-0.5"
    >
      <li
        v-for="item in items"
        :key="`${item.line}-${item.id}`"
      >
        <button
          class="w-full truncate rounded-md py-1 pr-2 text-left text-sm hover:bg-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :class="[
            INDENT[item.level] || 'pl-16',
            item.id === activeId ? 'bg-raised font-medium' : '',
            item.level === 1 ? 'font-medium' : 'text-ink-muted',
          ]"
          type="button"
          :aria-current="item.id === activeId ? 'true' : undefined"
          @click="$emit('select', item)"
        >
          {{ item.text || "Untitled heading" }}
        </button>
      </li>
    </ul>
  </nav>
</template>
