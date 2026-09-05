import type { WorkspaceSupportStatus } from "~/types/workspace";

export interface WorkspaceEnvironment {
  isClient: boolean;
  isSecureContext: boolean;
  isCrossOriginFrame: boolean;
  hasDirectoryPicker: boolean;
  hasRandomUuid: boolean;
  hasIndexedDb: boolean;
  isMobile: boolean;
}

/** Ordered by cause: an insecure origin also hides the picker, so checking the
 * API first would blame the browser for a deployment problem. */
export const resolveWorkspaceSupport = (
  env: WorkspaceEnvironment,
): WorkspaceSupportStatus => {
  if (!env.isClient) return "unknown";
  if (!env.isSecureContext) return "insecure-context";
  if (env.isCrossOriginFrame) return "embedded-frame";
  if (!env.hasDirectoryPicker || !env.hasRandomUuid) {
    return env.isMobile ? "mobile-browser" : "unsupported-browser";
  }
  if (!env.hasIndexedDb) return "no-storage";
  return "supported";
};

const detectCrossOriginFrame = (): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.top?.location.origin !== window.location.origin;
  } catch {
    return true;
  }
};

/** Presence only: with site data blocked, `indexedDB` exists and `open()`
 * rejects later, as a regular workspace error. */
const detectIndexedDb = (): boolean => {
  try {
    return Boolean(window.indexedDB);
  } catch {
    return false;
  }
};

export const readWorkspaceEnvironment = (): WorkspaceEnvironment => ({
  isClient: true,
  isSecureContext: window.isSecureContext,
  isCrossOriginFrame: detectCrossOriginFrame(),
  hasDirectoryPicker: "showDirectoryPicker" in window,
  hasRandomUuid: typeof globalThis.crypto?.randomUUID === "function",
  hasIndexedDb: detectIndexedDb(),
  isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
});
