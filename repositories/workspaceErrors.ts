export class WorkspaceFileExistsError extends Error {
  constructor(readonly path: string) {
    super(`A file already exists at ${path}.`);
    this.name = "WorkspaceFileExistsError";
  }
}

export class WorkspaceBaselineChangedError extends Error {
  constructor(readonly path: string) {
    super(`${path} changed on disk since it was opened.`);
    this.name = "WorkspaceBaselineChangedError";
  }
}

export class WorkspaceWriteVerificationError extends Error {
  constructor(readonly path: string) {
    super(`${path} did not match the written content after saving.`);
    this.name = "WorkspaceWriteVerificationError";
  }
}

export class WorkspacePermissionError extends Error {
  constructor(readonly path: string) {
    super(`Access to ${path} was denied.`);
    this.name = "WorkspacePermissionError";
  }
}

export const isPermissionError = (error: unknown): boolean =>
  error instanceof WorkspacePermissionError ||
  (error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "SecurityError"));

/** The folder was renamed, moved, or removed while its handle was held. */
export class WorkspaceRootMissingError extends Error {
  constructor(readonly directoryName: string) {
    super(`${directoryName} is no longer at the location it was opened from.`);
    this.name = "WorkspaceRootMissingError";
  }
}

/** The root is intact but this path is not in it any more. */
export class WorkspaceFileMissingError extends Error {
  constructor(readonly path: string) {
    super(`${path} is no longer in the workspace folder.`);
    this.name = "WorkspaceFileMissingError";
  }
}

/** Renamed, moved and deleted entries all surface the same way. */
export const isMissingEntryError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "NotFoundError";
