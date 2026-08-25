import * as React from "react";
import { useConfig } from "../config/config.hook";
import { listDir, subscribeFsChanges, unwatchDir, watchDir } from "../ipc/ipc.fs";
import type { FsEntry } from "../ipc/ipc.types";
import { typeLabel } from "./file-list.format";
import type {
  FileListApi,
  SelectOptions,
  SortDirection,
  SortKey,
  SortState,
} from "./file-list.types";

const DEFAULT_SORT: SortState = { key: "name", direction: "asc" };

function isDirLike(entry: FsEntry): boolean {
  return entry.kind === "dir";
}

function compareBy(key: SortKey, a: FsEntry, b: FsEntry): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "size":
      return (a.size ?? -1) - (b.size ?? -1);
    case "type":
      return typeLabel(a).localeCompare(typeLabel(b));
    case "modified":
      return (a.modifiedMs ?? 0) - (b.modifiedMs ?? 0);
    default:
      return 0;
  }
}

function sortEntries(entries: readonly FsEntry[], sort: SortState): FsEntry[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    if (isDirLike(a) !== isDirLike(b)) {
      return isDirLike(a) ? -1 : 1;
    }
    const primary = compareBy(sort.key, a, b) * sign;
    return primary !== 0
      ? primary
      : a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function nextDirection(current: SortState, key: SortKey): SortDirection {
  if (current.key !== key) {
    return "asc";
  }
  return current.direction === "asc" ? "desc" : "asc";
}

/** Loads, sorts, filters, and manages selection for the current directory's contents. */
export function useFileList(path: string): FileListApi {
  const { showHiddenFiles } = useConfig();
  const [rawEntries, setRawEntries] = React.useState<FsEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sort, setSortState] = React.useState<SortState>(DEFAULT_SORT);
  const [filterText, setFilterText] = React.useState("");
  const [selectedPaths, setSelectedPaths] = React.useState<ReadonlySet<string>>(new Set());
  const anchorRef = React.useRef<string | null>(null);

  const load = React.useCallback(async (target: string) => {
    if (!target) {
      setRawEntries([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listDir(target);
      setRawEntries(result.entries);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setRawEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setSelectedPaths(new Set());
    anchorRef.current = null;
    setFilterText("");
    void load(path);

    if (!path) {
      return;
    }

    let unlisten: (() => void) | undefined;
    void watchDir(path).catch(() => undefined);
    void subscribeFsChanges((payload) => {
      if (payload.parent === path) {
        void load(path);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);

    return () => {
      unlisten?.();
      void unwatchDir(path).catch(() => undefined);
    };
  }, [path, load]);

  const filtered = React.useMemo(() => {
    const visible = showHiddenFiles
      ? rawEntries
      : rawEntries.filter((entry) => !entry.hidden && !entry.system);
    if (!filterText.trim()) {
      return visible;
    }
    const needle = filterText.trim().toLowerCase();
    return visible.filter((entry) => entry.name.toLowerCase().includes(needle));
  }, [rawEntries, filterText, showHiddenFiles]);

  const entries = React.useMemo(() => sortEntries(filtered, sort), [filtered, sort]);

  const setSort = React.useCallback((key: SortKey) => {
    setSortState((current) => ({ key, direction: nextDirection(current, key) }));
  }, []);

  const selectEntry = React.useCallback(
    (targetPath: string, options?: SelectOptions) => {
      if (options?.range && anchorRef.current) {
        const paths = entries.map((entry) => entry.path);
        const anchorIndex = paths.indexOf(anchorRef.current);
        const targetIndex = paths.indexOf(targetPath);
        if (anchorIndex >= 0 && targetIndex >= 0) {
          const [start, end] =
            anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
          setSelectedPaths(new Set(paths.slice(start, end + 1)));
          return;
        }
      }

      if (options?.additive) {
        setSelectedPaths((current) => {
          const next = new Set(current);
          if (next.has(targetPath)) {
            next.delete(targetPath);
          } else {
            next.add(targetPath);
          }
          return next;
        });
        anchorRef.current = targetPath;
        return;
      }

      setSelectedPaths(new Set([targetPath]));
      anchorRef.current = targetPath;
    },
    [entries],
  );

  const selectAll = React.useCallback(() => {
    setSelectedPaths(new Set(entries.map((entry) => entry.path)));
  }, [entries]);

  const clearSelection = React.useCallback(() => {
    setSelectedPaths(new Set());
    anchorRef.current = null;
  }, []);

  const refresh = React.useCallback(() => load(path), [load, path]);

  return {
    entries,
    loading,
    error,
    sort,
    setSort,
    filterText,
    setFilterText,
    selectedPaths,
    selectEntry,
    selectAll,
    clearSelection,
    refresh,
  };
}
