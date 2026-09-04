import { renderMarkdown } from "~/utils/markdown";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const asFilename = (title: string) =>
  `${title.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "document"}.md`;

const page = (title: string, body: string, publishedAt?: string, token?: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="description" content="A shared Markdown document.">
  <meta property="og:title" content="Shared Markdown document">
  <meta property="og:description" content="A shared Markdown document.">
  <title>${escapeHtml(title)} · Markdown Editor</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#09090b;color:#f4f4f5}
    *{box-sizing:border-box}body{margin:0}header{border-bottom:1px solid #ffffff1a;padding:1rem 1.25rem}
    header div,article{max-width:48rem;margin:auto}header div{display:flex;justify-content:space-between;gap:1rem;align-items:center}
    h1,h2,h3{letter-spacing:-.025em;line-height:1.2}p,li{line-height:1.75;color:#d4d4d8}a{color:#e4e4e7}
    img{max-width:100%;height:auto}pre{overflow:auto;border:1px solid #ffffff1a;background:#18181b;padding:1rem;border-radius:.5rem}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}article{padding:2.5rem 1.25rem 5rem}
    .meta{min-width:0}.title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f4f4f5;margin:0;font-size:.875rem;font-weight:600}
    .date{font-size:.75rem;color:#71717a;margin:.25rem 0 0}.download{flex:none;border:1px solid #ffffff1a;border-radius:.375rem;padding:.5rem .75rem;text-decoration:none;font-size:.75rem}
    .missing{text-align:center;padding-top:30vh}.missing p{font-size:.875rem;color:#71717a}
  </style>
</head>
<body>
  ${publishedAt && token ? `<header><div><div class="meta"><p class="title">${escapeHtml(title)}</p><p class="date">Shared ${escapeHtml(publishedAt)}</p></div><a class="download" href="/p/${escapeHtml(token)}.md">Download .md</a></div></header>` : ""}
  <article>${body}</article>
</body>
</html>`;

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  const pathname = getRequestURL(event).pathname;
  const markdownMatch = pathname.match(/\/p\/([A-Za-z0-9_-]{32})\.md$/);
  const isMarkdown = Boolean(markdownMatch);
  const token = markdownMatch?.[1] || requirePublicationToken(event);
  const identity = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  await enforceRateLimit(event, "public-read", identity);
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("publications")
    .select("title,content,published_at")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    console.error("Public article read failed", { code: error.code });
    throw apiError(500, "Unable to load publication", "CONFIGURATION_ERROR");
  }
  if (!data) {
    setResponseStatus(event, 404, "Document not found");
    if (isMarkdown) {
      setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
      return "Document not found";
    }
    setResponseHeader(event, "content-type", "text/html; charset=utf-8");
    return page(
      "Document not found",
      '<div class="missing"><h1>Document not found</h1><p>This link is invalid or no longer available.</p></div>',
    );
  }

  if (isMarkdown) {
    setResponseHeaders(event, {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${asFilename(data.title)}"`,
    });
    return data.content;
  }

  setResponseHeader(event, "content-type", "text/html; charset=utf-8");
  const publishedAt = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(data.published_at),
  );
  return page(data.title, renderMarkdown(data.content), publishedAt, token);
});
