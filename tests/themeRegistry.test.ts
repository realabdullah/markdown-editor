import { describe, expect, it } from "vitest";
import {
  BUILT_IN_THEMES,
  DEFAULT_DARK_ID,
  DEFAULT_LIGHT_ID,
  THEMES_BY_ID,
} from "../themes/registry";
import { TOKEN_NAMES } from "../themes/tokens";
import { contrastRatio, parseChannels } from "./helpers/contrast";

describe("theme registry", () => {
  it("has unique, slug-shaped ids", () => {
    const ids = BUILT_IN_THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("resolves the system defaults to themes of the matching appearance", () => {
    expect(THEMES_BY_ID.get(DEFAULT_LIGHT_ID)?.appearance).toBe("light");
    expect(THEMES_BY_ID.get(DEFAULT_DARK_ID)?.appearance).toBe("dark");
  });

  it.each(BUILT_IN_THEMES)("$name defines every token as sRGB channels", (theme) => {
    // The type system already requires this; the check catches a cast.
    for (const name of TOKEN_NAMES) {
      expect(theme.tokens[name], `${theme.id} is missing ${name}`).toBeDefined();
      expect(() => parseChannels(theme.tokens[name]!)).not.toThrow();
    }
    expect(theme.appearance === "light" || theme.appearance === "dark").toBe(true);
    expect(theme.shadows.panel.length).toBeGreaterThan(0);
    expect(theme.description.length).toBeGreaterThan(0);
  });
});

/** The thresholds PLAN.md commits to, checked for every theme. */
describe("theme contrast", () => {
  it.each(BUILT_IN_THEMES)("$name keeps text and focus legible", (theme) => {
    const t = theme.tokens;
    for (const surface of [t["surface-app"]!, t["surface-panel"]!]) {
      expect(contrastRatio(t.ink!, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t["ink-muted"]!, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t["ink-subtle"]!, surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.focus!, surface)).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(t["accent-fg"]!, t.accent!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t["editor-fg"]!, t["editor-bg"]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BUILT_IN_THEMES)("$name keeps status text readable on its surface", (theme) => {
    for (const status of ["danger", "warning", "success"] as const) {
      expect(
        contrastRatio(theme.tokens[`${status}-fg`]!, theme.tokens[`${status}-surface`]!),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
