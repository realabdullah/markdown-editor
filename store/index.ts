import { defineStore } from "pinia";

export const useStore = defineStore("store", () => {
    const docTitle = ref("Untitled Document.md");
    const currentTheme = ref("light");
    const rawText = ref("");
    const parsedText = ref("");
    const isPreviewActive = ref(false);

    // set theme based on prefers-color-scheme media query
    const setTheme = (theme: string, mode?: string) => {
        currentTheme.value = theme;
        document.documentElement.setAttribute("data-theme", theme);
        // save theme to cookies if user selects a theme
        if (mode) {
            const mediaTheme = useCookie("theme");
            mediaTheme.value = theme;
        }
    };

    return {
        rawText,
        parsedText,
        docTitle,
        currentTheme,
        isPreviewActive,
        setTheme,
    };
});
