import type { ThemeTokens } from "~/themes/tokens";

export type ThemeAppearance = "light" | "dark";

/**
 * Left as a plain string rather than a union of the built-ins, so a theme
 * defined outside the registry needs no type change. Validity is a runtime
 * lookup in the registry, not a compile-time one.
 */
export type ThemeId = string;

export type ThemePreference = "system" | ThemeId;

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  appearance: ThemeAppearance;
  tokens: ThemeTokens;
  /** Values that are not colours and so cannot be channel triples. */
  shadows: { panel: string };
}
