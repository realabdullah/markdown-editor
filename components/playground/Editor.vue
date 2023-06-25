<script lang="ts" setup>
const { rawText } = storeToRefs(useStore());
</script>

<template>
    <div class="editor d-flex flex-column">
        <div class="header position-sticky weight-500">MARKDOWN</div>
        <textarea class="editor__area" v-model="rawText"></textarea>
    </div>
</template>

<style lang="scss" scoped>
.editor {

    .header {
        top: 0;

        @include font(1.4rem, 1.6rem);
        padding: 1.2rem 1.6rem;
        background-color: var(--deeper-bg-color);
        color: var(--sub-text-color);
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
