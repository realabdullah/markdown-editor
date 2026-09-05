import {
  isMigrationBannerVisible,
  migrateDocuments,
  type MigrationDocument,
  type MigrationResult,
  type MigrationSource,
} from "~/repositories/workspaceMigration";
import type { DocumentDetail, DocumentSummary } from "~/types";

/**
 * Offers the documents held in IndexedDB and in a signed-in account as files in
 * the open workspace. Legacy records are only ever read: nothing here deletes
 * them, and every import is idempotent, so a retry is always safe.
 */
export const useWorkspaceMigration = () => {
  const repository = useWorkspaceRepository();
  const { session, scan } = useWorkspace();
  const { user, isAuthReady, isConfigured, initialize } = useAuth();
  const localDocs = useMdDocs();

  const localPending = useState<DocumentDetail[]>(
    "workspaceMigrationLocal",
    () => [],
  );
  const accountPending = useState<DocumentSummary[]>(
    "workspaceMigrationAccount",
    () => [],
  );
  const isDismissed = useState("workspaceMigrationDismissed", () => false);
  const isRunning = useState<MigrationSource | "">(
    "workspaceMigrationRunning",
    () => "",
  );
  const statusMessage = useState("workspaceMigrationStatus", () => "");
  const errorMessage = useState("workspaceMigrationError", () => "");
  const accountLoadFailed = useState("workspaceMigrationAccountFailed", () => false);

  const isSignedIn = computed(() => Boolean(user.value));

  const isBannerVisible = computed(() =>
    isMigrationBannerVisible({
      hasWorkspace: Boolean(session.value),
      isDismissed: isDismissed.value,
      localCount: localPending.value.length,
      accountCount: accountPending.value.length,
      isAccountConfigured: isConfigured.value,
      isAuthReady: isAuthReady.value,
      isSignedIn: isSignedIn.value,
      accountLoadFailed: accountLoadFailed.value,
    }),
  );

  const withoutMarkers = async <T extends { id: string }>(
    source: MigrationSource,
    documents: T[],
  ): Promise<T[]> => {
    const workspaceId = session.value?.id;
    if (!workspaceId) return [];

    const pending: T[] = [];
    for (const document of documents) {
      const marker = await repository.loadMigrationMarker(
        workspaceId,
        source,
        document.id,
      );
      if (!marker) pending.push(document);
    }
    return pending;
  };

  /**
   * Unreadable import records must not hide a document. Offering everything is
   * the safe fallback: an import recognises files it already wrote by content
   * hash, so a repeat run adds nothing rather than duplicating.
   */
  const pendingOrAll = async <T extends { id: string }>(
    source: MigrationSource,
    documents: T[],
  ): Promise<T[]> => {
    try {
      return await withoutMarkers(source, documents);
    } catch {
      errorMessage.value =
        "Earlier import records could not be read, so every document is offered. Importing again will not create duplicates.";
      return documents;
    }
  };

  const detectAccountDocuments = async () => {
    accountLoadFailed.value = false;
    if (!isConfigured.value) {
      accountPending.value = [];
      return;
    }
    // Reads an existing session only; it never asks anyone to sign in.
    await initialize();
    if (!user.value) {
      accountPending.value = [];
      return;
    }
    let summaries: DocumentSummary[];
    try {
      summaries = await $fetch<DocumentSummary[]>("/api/documents");
    } catch {
      // Say so rather than looking like an account with nothing left to import.
      accountPending.value = [];
      accountLoadFailed.value = true;
      errorMessage.value =
        "Your account documents could not be listed. Reload to try again; nothing was changed.";
      return;
    }
    accountPending.value = await pendingOrAll("account", summaries);
  };

  const detect = async () => {
    const active = session.value;
    if (!import.meta.client || !active || active.permissionState !== "granted") {
      return;
    }

    // Detection owns this message; it is re-derived from scratch on every run.
    errorMessage.value = "";
    try {
      isDismissed.value = await repository.loadMigrationDismissed(active.id);
    } catch {
      isDismissed.value = false;
    }
    try {
      localPending.value = await pendingOrAll("local", await localDocs.getDocs());
    } catch {
      localPending.value = [];
    }
    await detectAccountDocuments();
  };

  const dismiss = async () => {
    isDismissed.value = true;
    if (session.value) {
      await repository.saveMigrationDismissed(session.value.id);
    }
  };

  const describe = (result: MigrationResult, source: MigrationSource) => {
    const label = source === "local" ? "this device" : "your account";
    const parts = [`Imported ${result.imported.length} of these documents from ${label}.`];
    if (result.skipped.length) {
      parts.push(`${result.skipped.length} were already imported.`);
    }
    if (result.failed.length) {
      parts.push(
        `${result.failed.length} could not be imported and are unchanged where they were.`,
      );
    }
    parts.push("Every original was left in place.");
    return parts.join(" ");
  };

  const run = async (source: MigrationSource, documents: MigrationDocument[]) => {
    const active = session.value;
    if (!active || isRunning.value || !documents.length) return;

    isRunning.value = source;
    statusMessage.value = "";
    errorMessage.value = "";

    try {
      const result = await migrateDocuments(documents, repository.migrationTarget(active), {
        workspaceId: active.id,
      });
      // Re-detect first: it resets the messages, so the outcome is reported last.
      await scan();
      await detect();
      statusMessage.value = describe(result, source);
      if (result.failed.length) {
        errorMessage.value = result.failed[0]!.message;
      }
    } catch {
      errorMessage.value = "The import could not be completed. Nothing was removed.";
    } finally {
      isRunning.value = "";
    }
  };

  const importLocal = () =>
    run(
      "local",
      localPending.value.map((document) => ({
        source: "local" as const,
        id: document.id,
        title: document.title,
        loadContent: async () => document.content,
      })),
    );

  const importAccount = () =>
    run(
      "account",
      accountPending.value.map((summary) => ({
        source: "account" as const,
        id: summary.id,
        title: summary.title,
        loadContent: async () =>
          (await $fetch<DocumentDetail>(`/api/documents/${summary.id}`)).content,
      })),
    );

  /** Sign-in is requested only here, when account import is chosen. */
  const signInForAccountImport = async () => {
    if (import.meta.client) {
      sessionStorage.setItem("auth:next", "/");
    }
    await navigateTo("/login");
  };

  return {
    localPending,
    accountPending,
    isSignedIn,
    isAccountConfigured: isConfigured,
    isBannerVisible,
    isRunning,
    statusMessage,
    errorMessage,
    detect,
    dismiss,
    importLocal,
    importAccount,
    signInForAccountImport,
  };
};
