<script lang="ts" setup>
const { rawText, isPreviewActive } = storeToRefs(useStore());
</script>

<template>
    <div class="editor d-flex flex-column">
        <div class="header position-sticky d-flex align-items-center weight-500">
            <span>MARKDOWN</span>
            <button @click="isPreviewActive = !isPreviewActive">
                <IconsPreview :is-preview-active="isPreviewActive" />
            </button>
        </div>
        <textarea class="editor__area" v-model="rawText"></textarea>
    </div>
</template>

<style lang="scss" scoped>
.editor {
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
            display: none;
            color: var(--sub-text-color);
            width: 1.6rem;
            height: 1.2rem;

            @media (max-width: 768px) {
                display: block;
            }

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
        // reset textarea style
        border: none;
        outline: none;
        resize: none;
        // font
        @include font(1.4rem, 1.6rem);
    }
}
</style>
