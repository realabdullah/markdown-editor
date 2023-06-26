<script lang="ts" setup>
const { docTitle, rawText, currentDocId } = storeToRefs(useStore());

const createDoc = () => {
    docTitle.value = "Untitled Document.md";
    rawText.value = "";
    currentDocId.value = "";
}
</script>

<template>
    <button class="weight-300 text-center" type="button" @click="createDoc">+ New Document</button>
</template>

<style lang="scss" scoped>
button {
    @include font(1.5rem, 1.8rem);
    color: $col-white;
    background-color: $col-redOrange;
    padding: 1.1rem;
    width: 100%;
    max-width: 20rem;
    border-radius: 0.4rem;
    transition: background-color 0.2s ease-in;

    &:hover {
        background-color: $col-redOrangeShade;
    }
}
</style>
