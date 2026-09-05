import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BUILT_IN_THEMES } from "~/themes/registry";
import { themesStylesheet } from "~/utils/themeCss";

// Run with `npm run themes:build`, which resolves the `~` alias through
// vitest.config.ts — the same resolution the drift test uses.
const target = fileURLToPath(new URL("../assets/css/themes.css", import.meta.url));
writeFileSync(target, themesStylesheet(BUILT_IN_THEMES), "utf8");
console.log(`Wrote ${BUILT_IN_THEMES.length} themes to ${target}`);
