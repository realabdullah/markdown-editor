import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BUILT_IN_THEMES } from "../themes/registry";
import { TOKEN_NAMES } from "../themes/tokens";
import { themesStylesheet, tokenBlock } from "../utils/themeCss";

const generated = fileURLToPath(new URL("../assets/css/themes.css", import.meta.url));

describe("themes.css", () => {
  // Checked in rather than built, so the tokens exist at first paint; this is
  // what catches an edited theme that was never regenerated.
  it("matches the checked-in stylesheet", () => {
    expect(readFileSync(generated, "utf8")).toBe(themesStylesheet(BUILT_IN_THEMES));
  });

  it("emits every token plus a colour scheme for each theme", () => {
    for (const theme of BUILT_IN_THEMES) {
      const block = tokenBlock(theme, `[data-theme="${theme.id}"]`);
      expect(block).toContain(`color-scheme: ${theme.appearance};`);
      expect(block).toContain("--shadow-panel:");
      for (const name of TOKEN_NAMES) expect(block).toContain(`--${name}: `);
    }
  });

  /**
   * A token holding `rgb(...)` instead of bare channels silently breaks every
   * opacity utility: the declaration becomes invalid and is dropped, so the
   * element inherits a colour rather than failing visibly.
   */
  it("stores colour tokens as bare channels", () => {
    for (const name of TOKEN_NAMES) {
      for (const theme of BUILT_IN_THEMES) {
        expect(theme.tokens[name]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      }
    }
  });
});
