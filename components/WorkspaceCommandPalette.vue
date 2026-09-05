<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { rankQuickOpen } from "~/utils/quickOpen";
import type { WorkspaceCommand, WorkspaceFile } from "~/types/workspace";

const props = defineProps<{
  files: WorkspaceFile[];
  commands: WorkspaceCommand[];
}>();

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{ "open-file": [path: string] }>();

const query = ref("");
const activeIndex = ref(0);

/** A leading `>` narrows the palette to commands, as in most editors. */
const isCommandMode = computed(() => query.value.startsWith(">"));
const term = computed(() =>
  isCommandMode.value ? query.value.slice(1).trim() : query.value.trim(),
);

const matchedCommands = computed(() => {
  const needle = term.value.toLowerCase();
  if (!isCommandMode.value && !needle) return [];
  return props.commands.filter((command) =>
    command.label.toLowerCase().includes(needle),
  );
});

const matchedFiles = computed(() =>
  isCommandMode.value ? [] : rankQuickOpen(props.files, term.value, 20),
);

type Entry =
  | { kind: "file"; id: string; label: string; hint: string }
  | { kind: "command"; id: string; label: string; hint: string; command: WorkspaceCommand };

const entries = computed<Entry[]>(() => [
  ...matchedFiles.value.map((file) => ({
    kind: "file" as const,
    id: file.path,
    label: file.name,
    hint: file.path,
  })),
  ...matchedCommands.value.map((command) => ({
    kind: "command" as const,
    id: `command:${command.id}`,
    label: command.label,
    hint: command.hint ?? "Command",
    command,
  })),
]);

watch([query, open], () => {
  activeIndex.value = 0;
});

watch(open, (value) => {
  if (!value) query.value = "";
});

const move = (delta: number) => {
  const count = entries.value.length;
  if (!count) return;
  activeIndex.value = (activeIndex.value + delta + count) % count;
};

const choose = async (entry: Entry | undefined) => {
  if (!entry) return;
  open.value = false;
  if (entry.kind === "file") {
    emit("open-file", entry.id);
    return;
  }
  await entry.command.run();
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    move(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    move(-1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    void choose(entries.value[activeIndex.value]);
  }
};
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-24 z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
      >
        <DialogTitle class="sr-only">
          Go to file or run a command
        </DialogTitle>
        <DialogDescription class="sr-only">
          Type to filter files. Start with a greater-than sign to list commands.
        </DialogDescription>

        <input
          v-model="query"
          class="w-full border-b border-zinc-200 bg-transparent px-4 py-3 text-sm focus:outline-none dark:border-zinc-800"
          type="text"
          placeholder="Go to file, or type > for commands"
          autocomplete="off"
          role="combobox"
          aria-expanded="true"
          aria-controls="workspace-palette-list"
          :aria-activedescendant="entries[activeIndex] ? `palette-${activeIndex}` : undefined"
          @keydown="onKeydown"
        >

        <ul
          id="workspace-palette-list"
          class="max-h-80 overflow-auto p-1.5"
          role="listbox"
          aria-label="Files and commands"
        >
          <li
            v-for="(entry, index) in entries"
            :id="`palette-${index}`"
            :key="entry.id"
            class="cursor-pointer rounded-md px-3 py-2"
            :class="index === activeIndex ? 'bg-zinc-100 dark:bg-zinc-900' : ''"
            role="option"
            :aria-selected="index === activeIndex"
            @click="choose(entry)"
            @mousemove="activeIndex = index"
          >
            <span class="block truncate text-sm">{{ entry.label }}</span>
            <span class="block truncate text-xs text-zinc-500">{{ entry.hint }}</span>
          </li>
          <li
            v-if="!entries.length"
            class="px-3 py-2 text-sm text-zinc-500"
          >
            Nothing matches “{{ term }}”.
          </li>
        </ul>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
