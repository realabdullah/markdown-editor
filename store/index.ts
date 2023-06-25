import { defineStore } from "pinia";

export const useStore = defineStore("store", () => {
    const docTitle = ref("Untitled Document.md");

    return {
        docTitle,
    };
});
