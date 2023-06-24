<script lang="ts" setup>
const currentMode = ref('light');

const switchTheme = () => currentMode.value = currentMode.value === "dark" ? "light" : "dark";
</script>

<template>
    <div class="d-flex align-items-center gap-5">
        <IconsTheme variant="dark" :class="{ active: currentMode === 'dark' }" />
        <div class="toggle position-relative">
            <input id="switch" class="d-none" type="checkbox" :checked="currentMode === 'light'" @change="switchTheme" />
            <label for="switch" class="d-block position-relative"></label>
        </div>
        <IconsTheme variant="light" :class="{ active: currentMode === 'light' }" />
    </div>
</template>

<style lang="scss" scoped>
svg {
    color: $col-lightCyanBlue;
}

.active {
    color: $col-white;
}

.toggle {

    input {

        &:checked+label {
            background-color: $col-lightCyanBlue;

            &::after {
                left: 2.8rem;
            }
        }
    }

    label {
        cursor: pointer;
        width: 4.8rem;
        height: 2.4rem;
        background-color: $col-lightCyanBlue;
        border-radius: 2rem;

        &::after {
            content: '';
            position: absolute;
            top: 0.6rem;
            left: 0.6rem;
            width: 1.2rem;
            height: 1.2rem;
            background-color: $col-white;
            border-radius: 50%;
            transition: 0.2s;
        }
    }
}
</style>
