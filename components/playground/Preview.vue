<script lang="ts" setup>
// import css
import "../../assets/css/preview.css";

import { Remarkable } from 'remarkable';
const { rawText, parsedText } = storeToRefs(useStore());

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
            <button>
                <IconsPreview />
            </button>
        </div>
        <div class="preview__area" v-html="parsedText"></div>
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
        }
    }

    &__area {
        flex: 1;
        padding: 0.9rem 1.6rem;
        background-color: var(--bg-color);
        color: var(--header-text-color);
        overflow: auto;
        padding-bottom: 10rem;
    }
}
</style>
