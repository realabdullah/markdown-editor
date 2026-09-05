export interface WorkspaceSearchHit {
  path: string;
  line: number;
  excerpt: string;
}

/** Files above the index size limit are never added. */
export class WorkspaceSearchIndex {
  private readonly contents = new Map<string, string>();

  set = (path: string, content: string) => {
    this.contents.set(path, content);
  };

  delete = (path: string) => {
    this.contents.delete(path);
  };

  clear = () => {
    this.contents.clear();
  };

  get size() {
    return this.contents.size;
  }

  has = (path: string) => this.contents.has(path);

  search = (query: string, limit = 50): WorkspaceSearchHit[] => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const hits: WorkspaceSearchHit[] = [];
    for (const [path, content] of this.contents) {
      const lines = content.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] as string;
        if (!line.toLowerCase().includes(term)) continue;
        hits.push({ path, line: index + 1, excerpt: line.trim() });
        if (hits.length >= limit) return hits;
        break;
      }
    }
    return hits;
  };
}

export const workspaceSearchIndex = new WorkspaceSearchIndex();
