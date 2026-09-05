export interface EditorToast {
  id: string;
  title: string;
  tone: "success" | "error" | "info";
}

export const useToasts = () => {
  const toasts = useState<EditorToast[]>("editorToasts", () => []);

  const dismiss = (id: string) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  };

  const push = (
    title: string,
    tone: EditorToast["tone"] = "info",
    ttl = tone === "error" ? 8000 : 5000,
  ) => {
    const id = crypto.randomUUID();
    toasts.value = [...toasts.value, { id, title, tone }];
    if (import.meta.client) {
      window.setTimeout(() => dismiss(id), ttl);
    }
  };

  return { toasts, push, dismiss };
};
