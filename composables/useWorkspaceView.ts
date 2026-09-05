import type { WorkspaceMobilePane, WorkspaceViewMode } from "~/types/workspace";

const MOBILE_QUERY = "(max-width: 1023px)";

/** Desktop remembers the last pane mode; narrow viewports use Write/Read. */
export const useWorkspaceView = () => {
  const repository = useWorkspaceRepository();

  const viewMode = useState<WorkspaceViewMode>("workspaceViewMode", () => "split");
  const mobilePane = useState<WorkspaceMobilePane>(
    "workspaceMobilePane",
    () => "write",
  );
  const isNarrow = useState<boolean>("workspaceIsNarrow", () => false);
  const isPaletteOpen = useState<boolean>("workspacePaletteOpen", () => false);
  const isOutlineOpen = useState<boolean>("workspaceOutlineOpen", () => true);
  const isSettingsOpen = useState<boolean>("workspaceSettingsOpen", () => false);

  const showEditor = computed(() =>
    isNarrow.value ? mobilePane.value === "write" : viewMode.value !== "reading",
  );
  const showPreview = computed(() =>
    isNarrow.value ? mobilePane.value === "read" : viewMode.value !== "editor",
  );

  const setViewMode = (mode: WorkspaceViewMode) => {
    viewMode.value = mode;
    void repository.saveViewMode(mode);
  };

  const setMobilePane = (pane: WorkspaceMobilePane) => {
    mobilePane.value = pane;
  };

  let media: MediaQueryList | null = null;
  const syncNarrow = (event: MediaQueryList | MediaQueryListEvent) => {
    isNarrow.value = event.matches;
  };

  const restoreViewMode = async () => {
    const stored = await repository.loadViewMode();
    if (stored) viewMode.value = stored;
  };

  const watchViewport = () => {
    media = window.matchMedia(MOBILE_QUERY);
    syncNarrow(media);
    media.addEventListener("change", syncNarrow);
  };

  const unwatchViewport = () => {
    media?.removeEventListener("change", syncNarrow);
    media = null;
  };

  return {
    viewMode,
    mobilePane,
    isNarrow,
    isPaletteOpen,
    isOutlineOpen,
    isSettingsOpen,
    showEditor,
    showPreview,
    setViewMode,
    setMobilePane,
    restoreViewMode,
    watchViewport,
    unwatchViewport,
  };
};
