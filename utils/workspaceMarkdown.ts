import DOMPurify from "isomorphic-dompurify";
import MarkdownIt from "markdown-it";
import Token from "markdown-it/lib/token.mjs";
import type { RenderRule } from "markdown-it/lib/renderer.mjs";
import type { WorkspaceOutlineItem } from "~/types/workspace";

/**
 * GitHub-flavoured Markdown for workspace files: tables, task lists,
 * strikethrough, autolinks, and fenced code. Typographic substitution is off so
 * quotes, dashes, and ellipses round-trip exactly as they were typed, and
 * single newlines stay soft the way GitHub renders a `.md` file.
 */
const parser = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: true,
  typographer: false,
});

/** True for anything the browser can load on its own (or must not load at all). */
const isAbsoluteReference = (source: string) =>
  /^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith("//");

/**
 * Resolves a Markdown-relative reference against the document that contains it,
 * so `docs/guide.md` + `../images/logo.png` becomes `images/logo.png`.
 * Returns an empty string when the reference escapes the workspace root.
 */
export const resolveWorkspacePath = (
  documentPath: string,
  reference: string,
): string => {
  const cleaned = reference.split(/[?#]/)[0] ?? "";
  if (!cleaned) return "";

  const base = cleaned.startsWith("/")
    ? []
    : documentPath.split("/").slice(0, -1);
  const segments = [...base];

  for (const segment of cleaned.replace(/^\//, "").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!segments.length) return "";
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join("/");
};

/** GitHub's heading anchor shape: lowercase, spaces to dashes, punctuation dropped. */
export const slugifyHeading = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-");

/** Repeats of the same heading get `-1`, `-2`, … exactly as GitHub does. */
export const createHeadingSlugger = () => {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugifyHeading(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
};

const TASK_ITEM = /^\[([ xX])\]\s+/;

/** Rewrites `- [ ] item` inline tokens into a disabled checkbox plus its text. */
const taskListRule = (tokens: Token[]) => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token?.type !== "inline") continue;

    const paragraphOpen = tokens[index - 1];
    const listItemOpen = tokens[index - 2];
    if (
      paragraphOpen?.type !== "paragraph_open" ||
      listItemOpen?.type !== "list_item_open"
    ) {
      continue;
    }

    const match = TASK_ITEM.exec(token.content);
    if (!match) continue;

    const checked = match[1]?.toLowerCase() === "x";
    token.content = token.content.slice(match[0].length);

    const first = token.children?.[0];
    if (first?.type === "text") {
      first.content = first.content.replace(TASK_ITEM, "");
    }

    const checkbox = new Token("html_inline", "", 0);
    checkbox.content = `<input class="task-list-item-checkbox" type="checkbox" disabled${
      checked ? " checked" : ""
    }> `;
    token.children = [checkbox, ...(token.children ?? [])];

    listItemOpen.attrJoin("class", "task-list-item");
    paragraphOpen.attrJoin("class", "task-list-item-label");
  }
};

parser.core.ruler.push("workspace_task_lists", (state) => {
  taskListRule(state.tokens);
  return true;
});

/**
 * Stamps every block-level element with the source line it came from. The
 * preview uses these to align its scroll position with the editor.
 */
parser.core.ruler.push("workspace_source_lines", (state) => {
  for (const token of state.tokens) {
    if (token.nesting === -1 || !token.map || !token.block) continue;
    token.attrSet("data-source-line", String((token.map[0] ?? 0) + 1));
  }
  return true;
});

const defaultRenderToken: RenderRule = (
  tokens,
  index,
  options,
  _environment,
  renderer,
) => renderer.renderToken(tokens, index, options);

const defaultLinkOpen = parser.renderer.rules.link_open || defaultRenderToken;

parser.renderer.rules.link_open = (
  tokens,
  index,
  options,
  environment,
  renderer,
) => {
  const token = tokens[index];
  if (!token) return "";
  const href = token.attrGet("href") || "";
  if (/^https?:\/\//i.test(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer nofollow");
  }
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};

parser.renderer.rules.heading_open = (
  tokens,
  index,
  options,
  environment,
  renderer,
) => {
  const token = tokens[index];
  const inline = tokens[index + 1];
  const slugger = (environment as { slugger?: (text: string) => string })
    .slugger;
  if (token && inline && slugger) {
    token.attrSet("id", slugger(inline.content));
  }
  return defaultRenderToken(tokens, index, options, environment, renderer);
};

/**
 * Remote images keep their URL, workspace-relative images are emitted without a
 * `src` and carry the resolved path so the preview can attach an object URL.
 */
parser.renderer.rules.image = (tokens, index, _options, environment) => {
  const token = tokens[index];
  if (!token) return "";

  const source = token.attrGet("src") || "";
  const alt = parser.utils.escapeHtml(token.content);

  if (/^https:\/\//i.test(source) || /^data:image\//i.test(source)) {
    return `<img src="${parser.utils.escapeHtml(
      source,
    )}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  }

  if (isAbsoluteReference(source)) {
    return alt;
  }

  const documentPath =
    (environment as { documentPath?: string }).documentPath || "";
  const resolved = resolveWorkspacePath(documentPath, source);
  if (!resolved) return alt;

  return `<img data-relative-src="${parser.utils.escapeHtml(
    resolved,
  )}" alt="${alt}" decoding="async">`;
};

const SANITIZE_OPTIONS = {
  ADD_ATTR: [
    "target",
    "rel",
    "loading",
    "decoding",
    "referrerpolicy",
    "checked",
    "disabled",
  ],
};

export const renderWorkspaceMarkdown = (
  source: string,
  documentPath = "",
): string =>
  DOMPurify.sanitize(
    parser.render(source, { documentPath, slugger: createHeadingSlugger() }),
    SANITIZE_OPTIONS,
  );

export const extractOutline = (source: string): WorkspaceOutlineItem[] => {
  const slugger = createHeadingSlugger();
  const tokens = parser.parse(source, {});
  const outline: WorkspaceOutlineItem[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const inline = tokens[index + 1];
    if (token?.type !== "heading_open" || !inline) continue;

    const text = inline.content.trim();
    outline.push({
      id: slugger(text),
      level: Number(token.tag.slice(1)),
      text,
      line: (token.map?.[0] ?? 0) + 1,
    });
  }

  return outline;
};

/**
 * The heading that owns a given line: the last one at or before it. Used to mark
 * the reader's place in the outline, so it accepts the fractional lines the
 * scroll sync reports as well as a whole caret line.
 */
export const outlineIdAtLine = (
  outline: WorkspaceOutlineItem[],
  line: number,
): string => {
  let current = "";
  for (const item of outline) {
    if (item.line > line) break;
    current = item.id;
  }
  return current;
};

/** Every relative image reference a document makes, resolved against its path. */
export const collectImageReferences = (
  source: string,
  documentPath: string,
): string[] => {
  const references = new Set<string>();
  const visit = (tokens: Token[]) => {
    for (const token of tokens) {
      if (token.type === "image") {
        const raw = token.attrGet("src") || "";
        if (raw && !isAbsoluteReference(raw)) {
          const resolved = resolveWorkspacePath(documentPath, raw);
          if (resolved) references.add(resolved);
        }
      }
      if (token.children?.length) visit(token.children);
    }
  };
  visit(parser.parse(source, {}));
  return [...references];
};

export const countDocumentStats = (source: string) => ({
  words: source.trim() ? (source.trim().match(/\S+/g)?.length ?? 0) : 0,
  characters: [...source].length,
});
