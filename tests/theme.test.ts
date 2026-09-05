import { describe, expect, it } from "vitest";
import { normalizePreference, resolveThemeId, themeFor } from "../utils/theme";

describe("normalizePreference", () => {
  it("keeps a known theme id and the system preference", () => {
    expect(normalizePreference("nocturne")).toBe("nocturne");
    expect(normalizePreference("system")).toBe("system");
  });

  it("migrates the two ids the editor stored before themes had names", () => {
    expect(normalizePreference("light")).toBe("paper");
    expect(normalizePreference("dark")).toBe("graphite");
  });

  it("falls back to the system preference, not a fixed appearance", () => {
    // A removed theme, a wrong type, and an empty slot all land here; following
    // the device is a better guess than pinning everyone to light.
    expect(normalizePreference("solarized")).toBe("system");
    expect(normalizePreference(null)).toBe("system");
    expect(normalizePreference(7)).toBe("system");
    expect(normalizePreference(undefined)).toBe("system");
  });
});

describe("resolveThemeId", () => {
  it("follows the device only when the preference is system", () => {
    expect(resolveThemeId("system", true)).toBe("graphite");
    expect(resolveThemeId("system", false)).toBe("paper");
    expect(resolveThemeId("parchment", true)).toBe("parchment");
    expect(resolveThemeId("contrast", false)).toBe("contrast");
  });
});

describe("themeFor", () => {
  it("returns the definition, falling back when the id is unknown", () => {
    expect(themeFor("daylight").name).toBe("Daylight");
    expect(themeFor("gone").id).toBe("paper");
  });
});
