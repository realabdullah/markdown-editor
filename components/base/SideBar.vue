<script lang="ts" setup>
const { docs } = storeToRefs(useStore());
const { setCurrentDoc } = useStore();

const convertDate = (date: string) => {
    const dateTime = new Date(date);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return dateTime.toLocaleDateString('en-US', options as any);
}
</script>

<template>
    <div class="sidebar d-flex align-items-start flex-column">
        <div class="up d-flex align-items-start flex-column">
            <IconsLogo class="logo" />
            <span class="header weight-500">MY DOCUMENTS</span>

            <ButtonsNewDoc />

            <ul v-if="docs && docs.length > 0" class="docs__list d-flex flex-column">
                <li v-for="doc in docs" class="docs__list-doc d-flex align-items-center gap-6" @click="setCurrentDoc(doc.id)">
                    <IconsDocument />
                    <div class="docs__list-doc-info d-flex flex-column gap-3">
                        <span class="docs__list-doc-info-date weight-300 text-overflow-ellipsis">{{ convertDate(doc.created) }}</span>
                        <span class="docs__list-doc-info-name weight-400 text-overflow-ellipsis">{{ doc.title }}</span>
                    </div>
                </li>
            </ul>
        </div>

        <div class="down">
            <Toggle />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.sidebar {
    justify-content: space-between;
    width: 30rem;
    height: 100vh;
    background-color: $col-darkBlue;
    padding: 2.7rem 2.4rem;

    .up {
        gap: 2.9rem;

        .logo {
            @media (min-width: 768px) {
                display: none;
            }
        }

        .header {
            font-size: 1.4rem;
            color: $col-lightCyanBlue;
            letter-spacing: 0.3rem;
        }

        .docs__list {
            gap: 2.6rem;

            &-doc {
                color: $col-white;
                cursor: pointer;

                &-info {
                    &-date {
                        @include font(1.3rem, 1.5rem);
                        white-space: nowrap;
                        color: $col-lightCyanBlue;
                    }

                    &-name {
                        @include font(1.5rem, 1.7rem);
                        white-space: nowrap;
                        color: $col-white;
                        text-transform: capitalize;
                    }
                }
            }
        }
    }
}
</style>
