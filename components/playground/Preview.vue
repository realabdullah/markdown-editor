<script lang="ts" setup>
// import css
import "../../assets/css/preview.css";

import { Remarkable } from 'remarkable';
const { rawText, parsedText, isPreviewActive } = storeToRefs(useStore());

const md = new Remarkable({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
});



// parse markdown function
const parseMarkdown = (text: string) => {
    return md.render(text);
};

// watch playground text
watchEffect(() => {
    parsedText.value = parseMarkdown(rawText.value);
});
</script>

<template>
    <div class="preview d-flex flex-column">
        <div class="header position-sticky d-flex align-items-center weight-500">
            <span>PREVIEW</span>
            <button @click="isPreviewActive = !isPreviewActive">
                <IconsPreview :is-preview-active="isPreviewActive" />
            </button>
        </div>
        <div class="preview__area" :class="{ active: isPreviewActive }" v-html="parsedText"></div>
    </div>
</template>

<style lang="scss" scoped>
.preview {
    overflow: auto;
    
    .header {
        top: 0;
        justify-content: space-between;

        padding: 1.2rem 1.6rem;
        background-color: var(--deeper-bg-color);
        color: var(--sub-text-color);

        span {
            @include font(1.4rem, 1.6rem);
        }

        button {
            color: var(--sub-text-color);
            width: 1.6rem;
            height: 1.2rem;

            svg {
                height: 100;
            }
        }
    }

    &__area {
        flex: 1;
        padding: 0.9rem 1.6rem;
        background-color: var(--bg-color);
        color: var(--header-text-color);
        overflow: auto;
        padding-bottom: 10rem;
        -ms-overflow-style: none;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .active {
        width: 100%;
        max-width: 70rem;
        margin: 0 auto;
    }
}
</style>
