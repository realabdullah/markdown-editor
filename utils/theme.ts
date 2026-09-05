import {
  DEFAULT_DARK_ID,
  DEFAULT_LIGHT_ID,
  THEMES_BY_ID,
  isThemeId,
} from "~/themes/registry";
import type { ThemeDefinition, ThemeId, ThemePreference } from "~/types/theme";

/** The two ids the editor shipped with before themes had names. */
const LEGACY_IDS: Record<string, ThemeId> = {
  light: DEFAULT_LIGHT_ID,
  dark: DEFAULT_DARK_ID,
};

/**
 * Turns whatever is in storage into a preference. Anything unrecognised —
 * including a theme that has since been removed — falls back to "system"
 * rather than to a fixed appearance, so the editor still matches the device.
 */
export const normalizePreference = (raw: unknown): ThemePreference => {
  if (typeof raw !== "string") return "system";
  if (raw === "system") return "system";
  if (raw in LEGACY_IDS) return LEGACY_IDS[raw]!;
  return isThemeId(raw) ? raw : "system";
};

export const resolveThemeId = (
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ThemeId => {
  if (preference !== "system" && isThemeId(preference)) return preference;
  return systemPrefersDark ? DEFAULT_DARK_ID : DEFAULT_LIGHT_ID;
};

export const themeFor = (id: ThemeId): ThemeDefinition =>
  THEMES_BY_ID.get(id) ?? THEMES_BY_ID.get(DEFAULT_LIGHT_ID)!;
