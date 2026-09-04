import type { PreviewStyle } from "./useEditorState";
import { containsRemoteImages, renderMarkdown as renderSafeMarkdown } from "~/utils/markdown";

export const useMarkdown = () => {
  const renderMarkdown = (source: string, style: PreviewStyle) => {
    const safeHtml = renderSafeMarkdown(source);
    return style === "minimal"
      ? safeHtml.replace(/<blockquote>/g, '<blockquote class="not-italic">')
      : safeHtml;
  };

  return { containsRemoteImages, renderMarkdown };
};
