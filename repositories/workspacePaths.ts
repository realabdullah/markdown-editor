export const hashContent = async (content: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const ILLEGAL_NAME_CHARACTERS = /[\\/:*?"<>|]/g;

export const toMarkdownPath = (input: string, parentPath = ""): string => {
  const name = input.trim().replace(ILLEGAL_NAME_CHARACTERS, "-");
  const withExtension = name.toLowerCase().endsWith(".md")
    ? name
    : `${name}.md`;
  return parentPath ? `${parentPath}/${withExtension}` : withExtension;
};

export const parentPathOf = (path: string): string => {
  const separator = path.lastIndexOf("/");
  return separator === -1 ? "" : path.slice(0, separator);
};

export const fileNameOf = (path: string): string =>
  path.slice(path.lastIndexOf("/") + 1);

/** `docs/api.md` becomes `docs/api.conflict.md`. */
export const toConflictPath = (path: string, attempt = 0): string => {
  const base = path.replace(/\.md$/i, "");
  const suffix = attempt > 0 ? `-${attempt + 1}` : "";
  return `${base}.conflict${suffix}.md`;
};

const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
] as const;

export const isImageAssetPath = (path: string) =>
  IMAGE_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(extension));

/** `docs/guide.md` + `images/logo.png` becomes `../images/logo.png`. */
export const toRelativePath = (fromPath: string, targetPath: string): string => {
  const from = fromPath.split("/").slice(0, -1);
  const to = targetPath.split("/");
  const name = to.pop() ?? "";

  let shared = 0;
  while (shared < from.length && shared < to.length && from[shared] === to[shared]) {
    shared += 1;
  }

  const segments = [
    ...Array.from({ length: from.length - shared }, () => ".."),
    ...to.slice(shared),
    name,
  ];
  return segments.join("/");
};
