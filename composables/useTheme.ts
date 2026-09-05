export const useTheme = () => {
  const preference = useCookie<"light" | "dark" | null>("md-editor-theme", {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  const themeMode = useState<"light" | "dark">("themeMode", () =>
    preference.value === "light" ? "light" : "dark",
  );

  const applyTheme = (theme: "light" | "dark") => {
    themeMode.value = theme;
    preference.value = theme;
    if (!import.meta.client) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("md-editor-theme", theme);
    } catch {
      // The cookie keeps the preference when browser storage is unavailable.
    }
  };

  const hydrateTheme = () => {
    if (!import.meta.client) return;
    let stored = preference.value;
    if (stored !== "light" && stored !== "dark") {
      try {
        stored = localStorage.getItem("md-editor-theme") as typeof stored;
      } catch { /* Use the system preference when storage is unavailable. */ }
    }
    applyTheme(stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  };

  return { themeMode, applyTheme, hydrateTheme };
};
