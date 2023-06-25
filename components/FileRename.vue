<script lang="ts" setup>
const { docTitle  } = storeToRefs(useStore());
</script>

<template>
    <div class="doc d-flex align-items-center w-100">
        <IconsDocument class="docsvg" />
        <form class="d-flex flex-column gap-1 w-100">
            <label for="docname" class="weight-300">Document Name</label>
            <input type="text" id="docname" class="w-100 weight-400" name="docname" v-model="docTitle" />
        </form>
    </div>
</template>

<style lang="scss" scoped>
.doc {
    max-width: 40rem;
    color: $col-white;

    .docsvg {
        width: 3.5rem;
    }

    label {
        @include font(1.3rem, 1.5rem);
        color: $col-lightCyanBlue;

        @media (max-width: 550px) {
            display: none;
        }
    }

    input {
        @include font(1.5rem, 1.7rem);
        border: none;
        background-color: transparent;
        color: $col-white;
        caret-color: $col-redOrange;

        &:focus {
            outline: none;
            border-bottom: 1px solid $col-white;
            width: 100%;
        }

        &::placeholder {
            color: $col-lightBlueShade;
        }

        &:-webkit-autofill,
        &:-webkit-autofill:hover,
        &:-webkit-autofill:focus,
        &:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px $col-darkBlue inset !important;
        }

        &:-webkit-autofill {
            -webkit-text-fill-color: $col-white !important;
        }
    }
}
</style>
