<script setup lang="ts">
import type { DocumentSummary } from "~/types";

const props = defineProps<{
  documents: DocumentSummary[];
  activeDocumentId: string;
  searchQuery: string;
  collapsed: boolean;
  themeMode: "light" | "dark";
  isAuthenticated: boolean;
  hasLocalDocumentsToImport: boolean;
  borderClass: string;
  surfaceClass: string;
  controlClass: string;
  itemClass: string;
  activeItemClass: string;
  mutedTextClass: string;
}>();

const emit = defineEmits<{
  "update:searchQuery": [value: string];
  "update:collapsed": [value: boolean];
  create: [];
  open: [id: string];
  theme: [];
  palette: [];
  import: [];
}>();
</script>

<template>
  <aside
    :class="[
      'hidden h-full border-r transition-all duration-300 md:flex md:flex-col',
      props.borderClass,
      props.surfaceClass,
      props.collapsed ? 'w-16' : 'w-64',
    ]"
  >
    <div :class="['flex h-12 items-center justify-between border-b px-3', props.borderClass]">
      <button
        :class="[props.controlClass, 'h-8 w-8 p-0']"
        @click="emit('update:collapsed', !props.collapsed)"
      >
        <span class="sr-only">Toggle sidebar</span>
        {{ props.collapsed ? ">" : "<" }}
      </button>
      <button
        v-if="!props.collapsed"
        :class="[props.controlClass, 'px-2 py-1 text-xs tracking-tight']"
        @click="emit('create')"
      >
        New
      </button>
    </div>

    <div v-if="!props.collapsed" class="flex h-full flex-col gap-3 px-3 py-3">
      <input
        :value="props.searchQuery"
        type="search"
        placeholder="Find files..."
        :class="[props.controlClass, 'px-3 py-2 text-sm placeholder:text-zinc-500']"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      >
      <div class="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        <button
          v-for="document in props.documents"
          :key="document.id"
          :class="[
            props.itemClass,
            document.id === props.activeDocumentId ? props.activeItemClass : '',
          ]"
          @click="emit('open', document.id)"
        >
          <span class="truncate tracking-tight">{{ document.title }}</span>
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button :class="[props.controlClass, 'px-2 py-2 text-xs']" @click="emit('theme')">
          {{ props.themeMode === "dark" ? "Light" : "Dark" }}
        </button>
        <button :class="[props.controlClass, 'px-2 py-2 text-xs']" @click="emit('palette')">
          Cmd+K
        </button>
      </div>
      <button
        v-if="props.isAuthenticated && props.hasLocalDocumentsToImport"
        :class="[props.controlClass, 'px-2 py-2 text-xs']"
        @click="emit('import')"
      >
        Add documents to account
      </button>
      <p :class="['text-[10px] uppercase tracking-[0.14em]', props.mutedTextClass]">
        {{ props.isAuthenticated ? "Saved to your account" : "Saved on this device" }}
      </p>
    </div>
  </aside>
</template>
