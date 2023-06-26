<script lang="ts" setup>
defineEmits(["save-changes"]);
</script>

<template>
  <button class="d-flex align-items-center gap-3 weight-300" type="button" @click="$emit('save-changes')">
    <IconsSave class="icon" />
    <span>Save Changes</span>
  </button>
</template>

<style lang="scss" scoped>
button {
  @include font(1.5rem, 1.8rem);
  color: $col-white;
  background-color: $col-redOrange;
  padding: 1.1rem 1.7rem;
  border-radius: 0.4rem;
  transition: background-color 0.2s ease-in;

  @media (max-width: 550px) {
    padding: 1.7rem 1.5rem;
  }

  &:hover {
    background-color: $col-redOrangeShade;
  }

  span {
    white-space: nowrap;
    
    @media (max-width: 550px) {
      display: none;
    }
  }
}
</style>
