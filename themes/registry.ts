import type { ThemeDefinition, ThemeId } from "~/types/theme";
import { paper } from "./definitions/paper";
import { parchment } from "./definitions/parchment";
import { daylight } from "./definitions/daylight";
import { graphite } from "./definitions/graphite";
import { nocturne } from "./definitions/nocturne";
import { contrast } from "./definitions/contrast";

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  paper,
  parchment,
  daylight,
  graphite,
  nocturne,
  contrast,
];

export const THEMES_BY_ID = new Map(
  BUILT_IN_THEMES.map((theme) => [theme.id, theme]),
);

/** What "system" resolves to. Both must keep matching their `appearance`. */
export const DEFAULT_LIGHT_ID = "paper";
export const DEFAULT_DARK_ID = "graphite";

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === "string" && THEMES_BY_ID.has(value);

/** The key both the boot script and `useTheme` read and write. */
export const THEME_STORAGE_KEY = "md-editor-theme";
