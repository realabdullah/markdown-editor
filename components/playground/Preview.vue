<script lang="ts" setup>
const readMe = ref("# Hello World");
</script>

<template>
    <div class="preview d-flex flex-column">
        <div class="header position-sticky d-flex align-items-center weight-500">
            <span>PREVIEW</span>
            <button>
                <IconsPreview />
            </button>
        </div>
        <div class="preview__area">{{ readMe }}</div>
    </div>
</template>

<style lang="scss" scoped>
.preview {

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
        }
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
