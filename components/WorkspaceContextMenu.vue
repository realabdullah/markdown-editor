<script setup lang="ts">
const props = defineProps<{ open: boolean; x: number; y: number; kind: "root" | "folder" | "file" }>();
const emit = defineEmits<{ close: []; newFile: []; newFolder: [] }>();
const menu = ref<HTMLElement | null>(null);

watch(() => props.open, async (open) => {
  if (!open) return;
  await nextTick();
  menu.value?.querySelector<HTMLButtonElement>("button")?.focus();
});

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") emit("close");
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const items = [...(menu.value?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
  const current = items.indexOf(document.activeElement as HTMLButtonElement);
  const step = event.key === "ArrowDown" ? 1 : -1;
  items[(current + step + items.length) % items.length]?.focus();
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-40"
      @pointerdown="emit('close')"
      @contextmenu.prevent="emit('close')"
    >
      <div
        ref="menu"
        role="menu"
        aria-label="File actions"
        class="fixed z-50 min-w-48 rounded-md border border-line-strong bg-panel p-1 text-sm shadow-lg"
        :style="{ left: `${x}px`, top: `${y}px` }"
        @keydown="onKeydown"
        @pointerdown.stop
      >
        <button
          class="block w-full rounded px-2 py-1.5 text-left hover:bg-raised focus:bg-raised focus:outline-none"
          role="menuitem"
          type="button"
          @click="emit('newFile')"
        >
          {{ kind === "file" ? "New file beside this" : "New Markdown file" }}
        </button>
        <button
          class="block w-full rounded px-2 py-1.5 text-left hover:bg-raised focus:bg-raised focus:outline-none"
          role="menuitem"
          type="button"
          @click="emit('newFolder')"
        >
          {{ kind === "file" ? "New folder beside this" : "New folder" }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
