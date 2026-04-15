import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import type { PreviewStyle } from "./useEditorState";

const parser = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
});

export const useMarkdown = () => {
  const renderMarkdown = (source: string, style: PreviewStyle) => {
    if (!import.meta.client) {
      return "";
    }
    const html = parser.render(source);
    const safeHtml = DOMPurify.sanitize(html);
    return style === "minimal"
      ? safeHtml.replace(/<blockquote>/g, '<blockquote class="not-italic">')
      : safeHtml;
  };

  return { renderMarkdown };
};
