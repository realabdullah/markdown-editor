<script setup lang="ts">
import {
  buildScrollAnchors,
  createEchoGuard,
  lineForOffset,
  offsetForLine,
  type ScrollAnchor,
} from "~/utils/scrollSync";
import { renderWorkspaceMarkdown } from "~/utils/workspaceMarkdown";

const props = defineProps<{
  source: string;
  documentPath: string;
  resolveAsset: (path: string) => Promise<File | null>;
}>();

const emit = defineEmits<{ "scroll-line": [line: number] }>();

const root = ref<HTMLElement | null>(null);
const article = ref<HTMLElement | null>(null);
const html = computed(() =>
  renderWorkspaceMarkdown(props.source, props.documentPath),
);

let scrollFrame = 0;
const echo = createEchoGuard();
const objectUrls = new Set<string>();

/**
 * Block offsets, measured once per layout change rather than per scroll event.
 * Reading a rect for every block on every frame is what turns a synced scroll
 * into a stuttering one, so the table is only rebuilt when the rendered content
 * or its size actually changes.
 */
let anchors: ScrollAnchor[] = [];
let measureFrame = 0;

const measure = () => {
  measureFrame = 0;
  const container = root.value;
  if (!container) return;

  const base = container.getBoundingClientRect().top - container.scrollTop;
  const raw: ScrollAnchor[] = [];
  for (const element of container.querySelectorAll<HTMLElement>(
    "[data-source-line]",
  )) {
    raw.push({
      line: Number(element.dataset.sourceLine),
      top: element.getBoundingClientRect().top - base,
    });
  }

  // A closing anchor lets the last block interpolate to the end of the scroll
  // range, so reaching the bottom of one pane reaches the bottom of the other.
  const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 0);
  raw.push({ line: props.source.split("\n").length + 1, top: maxScroll });

  anchors = buildScrollAnchors(raw);
};

const scheduleMeasure = () => {
  if (measureFrame) return;
  measureFrame = requestAnimationFrame(measure);
};

/**
 * Measuring is deferred to the next frame, but a scroll can arrive first — a
 * resize and a scroll in the same frame, say. Mapping against offsets from the
 * previous layout would land in the wrong place, so a pending measurement is
 * taken now rather than skipped.
 */
const flushMeasure = () => {
  if (!measureFrame) return;
  cancelAnimationFrame(measureFrame);
  measure();
};

const releaseObjectUrls = () => {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls.clear();
};

// Relative images render without a `src`; an object URL is attached so that
// no asset is ever copied.
const attachRelativeImages = async () => {
  const container = root.value;
  if (!container) return;

  const images = container.querySelectorAll<HTMLImageElement>("img[data-relative-src]");
  for (const image of images) {
    const path = image.dataset.relativeSrc;
    if (!path || image.getAttribute("src")) continue;
    try {
      const file = await props.resolveAsset(path);
      if (!file || image.dataset.relativeSrc !== path) continue;
      const url = URL.createObjectURL(file);
      objectUrls.add(url);
      // An image that arrives late changes every offset below it.
      image.addEventListener("load", scheduleMeasure, { once: true });
      image.src = url;
    } catch {
      image.replaceWith(image.alt || path);
    }
  }
};

const revealLine = (line: number) => {
  const container = root.value;
  if (!container) return;

  flushMeasure();
  if (!anchors.length) return;

  container.scrollTop = offsetForLine(anchors, line);
  echo.record(container.scrollTop);
};

const onScroll = () => {
  const container = root.value;
  if (!container || echo.isEcho(container.scrollTop) || scrollFrame) return;

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (!container.isConnected) return;
    flushMeasure();
    if (anchors.length) {
      emit("scroll-line", lineForOffset(anchors, container.scrollTop));
    }
  });
};

const revealHeading = (id: string) => {
  const heading = root.value?.querySelector<HTMLElement>(
    `[id="${CSS.escape(id)}"]`,
  );
  heading?.scrollIntoView({ block: "start" });
};

let observer: ResizeObserver | null = null;

watch(
  html,
  async () => {
    releaseObjectUrls();
    await nextTick();
    scheduleMeasure();
    await attachRelativeImages();
  },
  { immediate: true, flush: "post" },
);

onMounted(() => {
  // Reflow from a window resize or a pane toggle invalidates every offset.
  observer = new ResizeObserver(scheduleMeasure);
  if (article.value) observer.observe(article.value);
  if (root.value) observer.observe(root.value);
  scheduleMeasure();
});

onBeforeUnmount(() => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  if (measureFrame) cancelAnimationFrame(measureFrame);
  observer?.disconnect();
  releaseObjectUrls();
});

defineExpose({ revealLine, revealHeading });
</script>

<template>
  <div
    ref="root"
    class="workspace-preview h-full min-h-0 overflow-auto px-6 py-6"
    tabindex="0"
    aria-label="Rendered preview"
    @scroll="onScroll"
  >
    <!-- eslint-disable vue/no-v-html -- renderWorkspaceMarkdown sanitises its output -->
    <article
      ref="article"
      class="prose mx-auto"
      v-html="html"
    />
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>

<style>
.workspace-preview .task-list-item {
  list-style: none;
}

.workspace-preview .task-list-item-checkbox {
  margin-right: 0.4em;
  vertical-align: middle;
}

.workspace-preview :where(h1, h2, h3, h4, h5, h6) {
  scroll-margin-top: 1rem;
}
</style>
