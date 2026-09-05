import { describe, expect, it } from "vitest";
import { THEMES_BY_ID } from "../themes/registry";
import { TOKEN_NAMES } from "../themes/tokens";
import { documentStylesheet, standaloneHtml } from "../utils/exportDocument";

const parchment = THEMES_BY_ID.get("parchment")!;

describe("standaloneHtml", () => {
  it("is a complete document that fetches nothing", () => {
    const html = standaloneHtml({ title: "Notes", body: "<p>Hi</p>", theme: parchment });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('name="viewport"');
    // A downloaded file is often opened offline, or from file://.
    expect(html).not.toMatch(/(?:href|src)="https?:/);
    expect(html).not.toContain("<script");
  });

  it("escapes the title rather than interpolating it", () => {
    const html = standaloneHtml({ title: '</title><script>x</script>', body: "", theme: parchment });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;/title&gt;");
  });

  it("inlines the author's theme when one is given", () => {
    const html = standaloneHtml({ title: "T", body: "", theme: parchment });
    expect(html).toContain("color-scheme: light;");
    expect(html).toContain(`--surface-app: ${parchment.tokens["surface-app"]};`);
    expect(html).not.toContain("prefers-color-scheme");
  });

  it("follows the reader's device when no theme is given", () => {
    const html = standaloneHtml({ title: "T", body: "" });
    expect(html).toContain("color-scheme: light dark;");
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain(`--surface-app: ${THEMES_BY_ID.get("graphite")!.tokens["surface-app"]};`);
  });

  /**
   * A `var()` with no definition resolves to nothing and the declaration is
   * dropped, so a typo here is invisible rather than loud.
   */
  it("references only tokens the theme block defines", () => {
    const html = standaloneHtml({ title: "T", body: "", theme: parchment });
    const referenced = [...html.matchAll(/var\(--([a-z-]+)\)/g)].map((m) => m[1]!);
    expect(referenced.length).toBeGreaterThan(0);
    for (const name of new Set(referenced)) {
      expect(TOKEN_NAMES as readonly string[]).toContain(name);
    }
  });

  it("places chrome outside the article and extra css inside the style block", () => {
    const html = standaloneHtml({
      title: "T",
      body: "<p>body</p>",
      chrome: "<header>bar</header>",
      extraCss: ".x { color: red }",
    });
    expect(html.indexOf("<header>bar</header>")).toBeLessThan(html.indexOf("<main>"));
    expect(html).toContain(".x { color: red }");
  });
});

describe("documentStylesheet", () => {
  it("styles from tokens only, never from literal colours", () => {
    const css = documentStylesheet();
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(css).not.toMatch(/\brgba?\(\s*\d/);
  });
});
