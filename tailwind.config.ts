import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

/**
 * Colours are token references, never literals. Each `--token` holds bare sRGB
 * channels so the `<alpha-value>` placeholder keeps opacity utilities such as
 * `bg-overlay/40` working; see `themes/tokens.ts`.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default <Partial<Config>>{
  darkMode: ["class", '[data-appearance="dark"]'],
  theme: {
    extend: {
      colors: {
        app: token("surface-app"),
        panel: token("surface-panel"),
        sunken: token("surface-sunken"),
        raised: token("surface-raised"),
        overlay: token("surface-overlay"),

        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
          subtle: token("line-subtle"),
        },

        ink: {
          DEFAULT: token("ink"),
          muted: token("ink-muted"),
          subtle: token("ink-subtle"),
          inverted: token("ink-inverted"),
        },

        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          fg: token("accent-fg"),
        },
        focus: token("focus"),

        danger: {
          surface: token("danger-surface"),
          border: token("danger-border"),
          fg: token("danger-fg"),
        },
        warning: {
          surface: token("warning-surface"),
          border: token("warning-border"),
          fg: token("warning-fg"),
        },
        success: {
          surface: token("success-surface"),
          border: token("success-border"),
          fg: token("success-fg"),
        },
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "72ch",
            "--tw-prose-body": "rgb(var(--ink-muted))",
            "--tw-prose-headings": "rgb(var(--ink))",
            "--tw-prose-lead": "rgb(var(--ink-muted))",
            "--tw-prose-links": "rgb(var(--accent))",
            "--tw-prose-bold": "rgb(var(--ink))",
            "--tw-prose-counters": "rgb(var(--ink-subtle))",
            "--tw-prose-bullets": "rgb(var(--line-strong))",
            "--tw-prose-hr": "rgb(var(--line))",
            "--tw-prose-quotes": "rgb(var(--ink))",
            "--tw-prose-quote-borders": "rgb(var(--line))",
            "--tw-prose-captions": "rgb(var(--ink-subtle))",
            "--tw-prose-kbd": "rgb(var(--ink))",
            // The one variable the plugin wants as bare channels, not a colour.
            "--tw-prose-kbd-shadows": "var(--ink-subtle)",
            "--tw-prose-code": "rgb(var(--ink))",
            "--tw-prose-pre-code": "rgb(var(--ink-muted))",
            "--tw-prose-pre-bg": "rgb(var(--surface-sunken))",
            "--tw-prose-th-borders": "rgb(var(--line-strong))",
            "--tw-prose-td-borders": "rgb(var(--line))",
          },
        },
      },
    },
  },
  plugins: [typography],
};
