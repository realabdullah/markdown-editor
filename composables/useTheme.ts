import { BUILT_IN_THEMES, THEME_STORAGE_KEY } from "~/themes/registry";
import { normalizePreference, resolveThemeId, themeFor } from "~/utils/theme";
import type { ThemeDefinition, ThemePreference } from "~/types/theme";

let media: MediaQueryList | null = null;

/**
 * The boot script has already applied a theme by the time this runs, so
 * hydration only has to agree with what is on screen. That is why the
 * preference starts at "system" rather than at a fixed appearance.
 */
export const useTheme = () => {
  const preference = useState<ThemePreference>("themePreference", () => "system");
  const systemPrefersDark = useState<boolean>("systemPrefersDark", () => false);

  const theme = computed<ThemeDefinition>(() =>
    themeFor(resolveThemeId(preference.value, systemPrefersDark.value)),
  );
  const themeId = computed(() => theme.value.id);
  const appearance = computed(() => theme.value.appearance);

  const applyToDocument = (next: ThemeDefinition) => {
    if (!import.meta.client) return;
    const root = document.documentElement;
    root.dataset.theme = next.id;
    root.dataset.appearance = next.appearance;
    root.classList.toggle("dark", next.appearance === "dark");
    root.style.colorScheme = next.appearance;
  };

  const setPreference = (next: ThemePreference) => {
    preference.value = normalizePreference(next);
    if (!import.meta.client) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference.value);
    } catch {
      // Nothing to fall back to: without storage the choice lasts the session.
    }
  };

  const syncSystem = (event: MediaQueryList | MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches;
  };

  const hydrateTheme = () => {
    if (!import.meta.client) return;

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Use the system preference when storage is unavailable.
    }
    preference.value = normalizePreference(stored);

    // Watched even while a theme is pinned, to avoid listener churn on switch.
    media = window.matchMedia("(prefers-color-scheme: dark)");
    syncSystem(media);
    media.addEventListener("change", syncSystem);

    watchEffect(() => applyToDocument(theme.value));
  };

  const disposeTheme = () => {
    media?.removeEventListener("change", syncSystem);
    media = null;
  };

  return {
    preference,
    themeId,
    theme,
    appearance,
    themes: BUILT_IN_THEMES,
    setPreference,
    hydrateTheme,
    disposeTheme,
  };
};
