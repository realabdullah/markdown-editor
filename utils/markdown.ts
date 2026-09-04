import DOMPurify from "isomorphic-dompurify";
import MarkdownIt from "markdown-it";

const parser = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
});

const defaultLinkOpen =
  parser.renderer.rules.link_open ||
  ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));
const defaultImage =
  parser.renderer.rules.image ||
  ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));

parser.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
  const token = tokens[index];
  if (!token) {
    return "";
  }
  const href = token.attrGet("href") || "";
  if (/^https?:\/\//i.test(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer nofollow");
  }
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};

parser.renderer.rules.image = (tokens, index, options, environment, renderer) => {
  const token = tokens[index];
  if (!token) {
    return "";
  }
  const source = token.attrGet("src") || "";
  if (!/^https:\/\//i.test(source) && !/^data:image\//i.test(source)) {
    return token.content;
  }
  token.attrSet("loading", "lazy");
  token.attrSet("decoding", "async");
  token.attrSet("referrerpolicy", "no-referrer");
  return defaultImage(tokens, index, options, environment, renderer);
};

export const renderMarkdown = (source: string) =>
  DOMPurify.sanitize(parser.render(source), {
    ADD_ATTR: ["target", "rel", "loading", "decoding", "referrerpolicy"],
  });

export const containsRemoteImages = (source: string) => {
  const tokens = parser.parse(source, {});
  return tokens.some((token) =>
    token.children?.some(
      (child) =>
        child.type === "image" && /^https:\/\//i.test(child.attrGet("src") || ""),
    ),
  );
};
