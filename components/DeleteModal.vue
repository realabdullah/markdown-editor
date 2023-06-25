<script lang="ts" setup>
const { docTitle  } = storeToRefs(useStore());

interface Emit {
    (event: 'toggle-delete-modal'): void;
}

const emits = defineEmits<Emit>();

const toggleDeleteModal = () => emits('toggle-delete-modal');
</script>

<template>
    <div class="delete__modal d-flex flex-column w-100 h-100 position-absolute">
        <h4 class="weight-700">Delete this document?</h4>
        <p class="weight-400">Are you sure you want to delete the ‘{{ docTitle }}’ document and its contents? This action cannot
            be reversed.</p>
        <button class="w-100 weight-400">Confirm & Delete</button>
    </div>
    <div class="modal-overlay" @click="toggleDeleteModal"></div>
</template>

<style lang="scss" scoped>
.delete__modal {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: slide-down 0.3s ease-out both;

    gap: 1.6rem;
    max-width: 34.3rem;
    max-height: 21.8rem;
    background-color: var(--bg-color);
    padding: 2.4rem;
    border-radius: 0.4rem;
    z-index: 2;
    box-shadow: #110c2e26 0rem 4.8rem 10rem 0rem;

    h4 {
        @include font(2rem, 2.6rem);
        color: var(--header-text-color);
    }

    p {
        @include font(1.4rem, 2.4rem);
        color: var(--sub-text-color);
        width: 100%;
        max-width: 29.5rem;
    }

    button {
        background-color: $col-redOrange;
        color: $col-white;
        padding: 1.2rem;
        border-radius: 0.4rem;
        @include font(1.5rem, 1.7rem);
        transition: background-color 0.3s ease-out;

        &:hover {
            background-color: $col-redOrangeShade;
        }
    }
}

.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(2px);
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1;
}
</style>
