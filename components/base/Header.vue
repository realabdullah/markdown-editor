<script lang="ts" setup>

</script>

<template>
    <header class="w-100 d-flex align-items-center">
        <div class="left d-flex align-items-center gap-5">
            <button class="menu">
                <IconsMenu />
            </button>
            <IconsLogo class="logo w-100" />
            <hr />
            <FileRename />
        </div>

        <div class="right d-flex align-items-center gap-9">
            <button class="delete">
                <IconsDelete />
            </button>
            <ButtonsSave />
        </div>
    </header>
</template>

<style lang="scss" scoped>
header {
    height: 7.2rem;
    justify-content: space-between;
    background: $col-darkCyanBlue;
    
    .left {
        .menu {
            height: 7.2rem;
            width: 12rem;
            background: $col-darkGrayishBlue;
            color: $col-white;
            transition: background 0.2s ease-in-out;

            &:hover {
                background: $col-redOrange;
            }

            @media (max-width: 550px) {
                width: 7.2rem;
            }
        }

        .logo {
            max-width: 12rem;
            margin-left: 2.4rem;

            @media (max-width: 768px) {
                display: none;
            }
        }

        hr {
            height: 4rem;
            width: 1px;
            background: $col-lightCyanBlue;
            border: none;
            margin: 0 2.4rem;

            @media (max-width: 768px) {
                display: none;
            }
        }
    }

    .right {
        padding-right: 1.5rem;

        .delete {
            color: $col-lightCyanBlue;
            transition: color 0.2s ease-in-out;

            &:hover {
                color: $col-redOrange;
            }
        }
    }
}
</style>
