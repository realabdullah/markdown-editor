<script lang="ts" setup>
const readMe = ref("# Hello World");
</script>

<template>
    <div class="editor d-flex flex-column">
        <div class="header position-sticky weight-500">MARKDOWN</div>
        <div class="editor__area" contenteditable="true">{{ readMe }}</div>
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
    }
}
</style>
