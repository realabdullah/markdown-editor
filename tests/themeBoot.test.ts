import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "../themes/registry";
import { resolveThemeId, normalizePreference } from "../utils/theme";
import { themeBootScript } from "../utils/themeBoot";

const runBootScript = (stored: string | null, systemPrefersDark: boolean) => {
  const root = {
    dataset: {} as Record<string, string>,
    classList: {
      dark: false,
      toggle(name: string, on: boolean) {
        if (name === "dark") this.dark = on;
      },
    },
    style: {} as Record<string, string>,
  };

  const run = new Function(
    "localStorage",
    "matchMedia",
    "document",
    themeBootScript(),
  );
  run(
    { getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored : null) },
    () => ({ matches: systemPrefersDark }),
    { documentElement: root },
  );

  return root;
};

/**
 * The script has to run before any application code exists, so it necessarily
 * restates the resolution logic. These cases are what keeps the two in step.
 */
describe("theme boot script", () => {
  const cases: Array<[string | null, boolean]> = [
    [null, false],
    [null, true],
    ["system", false],
    ["system", true],
    ["light", true],
    ["dark", false],
    ["parchment", true],
    ["contrast", false],
    ["a-theme-that-was-removed", false],
    ["a-theme-that-was-removed", true],
  ];

  it.each(cases)("resolves %s (system dark: %s) the same way the app does", (stored, dark) => {
    const root = runBootScript(stored, dark);
    expect(root.dataset.theme).toBe(resolveThemeId(normalizePreference(stored), dark));
  });

  it("sets the appearance, the dark class and the colour scheme together", () => {
    // color-scheme is not cosmetic: native controls and scrollbars follow the
    // operating system without it, which reads as wrong on a themed page.
    const dark = runBootScript("nocturne", false);
    expect(dark.dataset.appearance).toBe("dark");
    expect(dark.classList.dark).toBe(true);
    expect(dark.style.colorScheme).toBe("dark");

    const light = runBootScript("parchment", true);
    expect(light.dataset.appearance).toBe("light");
    expect(light.classList.dark).toBe(false);
    expect(light.style.colorScheme).toBe("light");
  });

  it("reads the same storage key the composable writes", () => {
    expect(themeBootScript()).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });

  it("survives storage being unavailable", () => {
    const run = new Function("localStorage", "matchMedia", "document", themeBootScript());
    const root = { dataset: {}, classList: { toggle() {} }, style: {} };
    expect(() =>
      run(
        { getItem: () => { throw new Error("blocked"); } },
        () => ({ matches: true }),
        { documentElement: root },
      ),
    ).not.toThrow();
    expect((root.dataset as Record<string, string>).theme).toBe("graphite");
  });
});
