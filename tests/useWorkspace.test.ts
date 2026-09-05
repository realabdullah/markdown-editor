import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserWorkspaceRepository } from "../repositories/browserWorkspaceRepository";
import {
  asDirectoryHandle,
  createMemoryDirectory,
} from "./helpers/memoryFileSystem";
import { createMemoryAdapter } from "./helpers/memoryWorkspaceAdapter";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("useWorkspace", () => {
  it("can save an unchanged file back after it is deleted externally", async () => {
    const created = createMemoryDirectory({ "note.md": "kept text" });
    await created.ready;
    const repository = new BrowserWorkspaceRepository(
      createMemoryAdapter(asDirectoryHandle(created.root)).adapter,
    );
    const states = new Map<string, { value: unknown }>();

    vi.stubGlobal("useWorkspaceRepository", () => repository);
    vi.stubGlobal("useState", (key: string, init: () => unknown) => {
      const state = states.get(key) ?? { value: init() };
      states.set(key, state);
      return state;
    });
    vi.stubGlobal("computed", (get: () => unknown) => ({
      get value() {
        return get();
      },
    }));

    const { useWorkspace } = await import("../composables/useWorkspace");
    const workspace = useWorkspace();
    workspace.session.value = await repository.open();
    await workspace.openFile("note.md");
    created.root.children.delete("note.md");

    await workspace.refreshActiveDocument();
    expect(workspace.isDirty.value).toBe(true);

    await workspace.save();
    expect((await repository.read(workspace.session.value, "note.md")).content).toBe(
      "kept text",
    );
  });
});
