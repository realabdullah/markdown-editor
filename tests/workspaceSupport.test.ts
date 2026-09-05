import { describe, expect, it } from "vitest";
import {
  resolveWorkspaceSupport,
  type WorkspaceEnvironment,
} from "../repositories/workspaceSupport";

const supported: WorkspaceEnvironment = {
  isClient: true,
  isSecureContext: true,
  isCrossOriginFrame: false,
  hasDirectoryPicker: true,
  hasRandomUuid: true,
  hasIndexedDb: true,
  isMobile: false,
};

const env = (overrides: Partial<WorkspaceEnvironment>): WorkspaceEnvironment => ({
  ...supported,
  ...overrides,
});

describe("resolveWorkspaceSupport", () => {
  it("allows a secure top-level page with the full API", () => {
    expect(resolveWorkspaceSupport(supported)).toBe("supported");
  });

  it("waits rather than guessing before the client runs", () => {
    expect(resolveWorkspaceSupport(env({ isClient: false }))).toBe("unknown");
  });

  it("blames the origin, not the browser, on a plain-HTTP page", () => {
    const status = resolveWorkspaceSupport(
      env({ isSecureContext: false, hasDirectoryPicker: false, hasRandomUuid: false }),
    );
    expect(status).toBe("insecure-context");
  });

  it("reports an embedded frame ahead of the API check", () => {
    expect(resolveWorkspaceSupport(env({ isCrossOriginFrame: true }))).toBe(
      "embedded-frame",
    );
  });

  it("reports a missing picker on desktop as an unsupported browser", () => {
    expect(resolveWorkspaceSupport(env({ hasDirectoryPicker: false }))).toBe(
      "unsupported-browser",
    );
  });

  it("treats a secure context without randomUUID as unsupported", () => {
    expect(resolveWorkspaceSupport(env({ hasRandomUuid: false }))).toBe(
      "unsupported-browser",
    );
  });

  it("tells mobile visitors to move to a computer", () => {
    expect(
      resolveWorkspaceSupport(env({ hasDirectoryPicker: false, isMobile: true })),
    ).toBe("mobile-browser");
  });

  it("reports blocked storage separately from a missing API", () => {
    expect(resolveWorkspaceSupport(env({ hasIndexedDb: false }))).toBe("no-storage");
  });

  it("prefers the API message when both the API and storage are missing", () => {
    expect(
      resolveWorkspaceSupport(env({ hasDirectoryPicker: false, hasIndexedDb: false })),
    ).toBe("unsupported-browser");
  });
});
