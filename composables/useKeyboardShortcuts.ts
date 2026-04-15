interface ShortcutHandlers {
  onSave: () => void | Promise<void>;
  onDelete: () => void;
  onRename: () => void;
  onToggleLayout: () => void;
  onToggleZen: () => void;
  onOpenPalette: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const keydown = async (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const isMeta = event.metaKey || event.ctrlKey;

    if (isMeta && key === "s") {
      event.preventDefault();
      await handlers.onSave();
      return;
    }

    if ((event.ctrlKey && key === "d") || (event.metaKey && key === "backspace")) {
      event.preventDefault();
      handlers.onDelete();
      return;
    }

    if (event.key === "F2") {
      event.preventDefault();
      handlers.onRename();
      return;
    }

    if (isMeta && key === "\\") {
      event.preventDefault();
      handlers.onToggleLayout();
      return;
    }

    if (isMeta && event.shiftKey && key === "z") {
      event.preventDefault();
      handlers.onToggleZen();
      return;
    }

    if (isMeta && key === "k") {
      event.preventDefault();
      handlers.onOpenPalette();
    }
  };

  onMounted(() => window.addEventListener("keydown", keydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", keydown));
};
