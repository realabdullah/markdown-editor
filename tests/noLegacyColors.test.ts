import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));

/** Discovered rather than listed, so a new component cannot slip past the check. */
const findVueFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return findVueFiles(full);
    return entry.name.endsWith(".vue") ? [relative(root, full)] : [];
  });

const vueFiles = ["app.vue", ...findVueFiles(join(root, "components")), ...findVueFiles(join(root, "pages"))];

const PALETTE =
  /\b(?:bg|text|border|ring|from|via|to|divide|outline|decoration|shadow|accent|caret|fill|stroke|placeholder)-(?:zinc|gray|slate|neutral|stone|red|rose|amber|yellow|emerald|green|blue|indigo|purple|pink)-\d{2,3}\b/g;

// Matches the Tailwind variant, not a JS object key such as `{ dark: true }`.
const DARK_VARIANT = /\bdark:[a-z[]/g;

/**
 * A `dark:` variant is the failure worth guarding: it still looks right under
 * the two themes the editor shipped with and wrong under every other one, so it
 * survives review and fails in the product. Only a mechanical check finds those.
 */
describe("themed markup uses tokens, not palette classes", () => {
  it("checks every themed file", () => {
    expect(vueFiles.length).toBeGreaterThan(8);
  });

  it.each(vueFiles)("%s has no hardcoded palette colour", (path) => {
    const source = readFileSync(new URL(path, `file://${root}`), "utf8");
    expect(source.match(PALETTE) ?? []).toEqual([]);
  });

  it.each(vueFiles)("%s has no dark: variant", (path) => {
    const source = readFileSync(new URL(path, `file://${root}`), "utf8");
    expect(source.match(DARK_VARIANT) ?? []).toEqual([]);
  });
});
