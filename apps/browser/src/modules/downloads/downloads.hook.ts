import * as React from "react";
import { loadDownloads, saveDownloads } from "../ipc/ipc.browser-store";
import { subscribeDownloadFinished, subscribeDownloadStarted } from "../ipc/ipc.webview";
import {
  DOWNLOADS_MAX_ENTRIES,
  type DownloadEntry,
  type DownloadsApi,
  type DownloadsDocumentV1,
} from "./downloads.types";

const SAVE_DEBOUNCE_MS = 500;

function fileNameOf(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function parseDocument(json: string): DownloadEntry[] {
  try {
    const parsed = JSON.parse(json) as Partial<DownloadsDocumentV1>;
    if (parsed.version === 1 && Array.isArray(parsed.downloads)) {
      return parsed.downloads as DownloadEntry[];
    }
  } catch {
    // fall through to empty
  }
  return [];
}

function serializeDocument(downloads: readonly DownloadEntry[]): string {
  const doc: DownloadsDocumentV1 = { version: 1, downloads };
  return JSON.stringify(doc);
}

export function useDownloads(): DownloadsApi {
  const [downloads, setDownloads] = React.useState<DownloadEntry[]>([]);
  const loaded = React.useRef(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    void loadDownloads()
      .then((json) => {
        if (!cancelled) {
          setDownloads(parseDocument(json));
        }
      })
      .catch(() => {
        // No persisted downloads yet (or IPC unavailable) — start empty.
      })
      .finally(() => {
        if (!cancelled) {
          loaded.current = true;
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!loaded.current) {
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDownloads(serializeDocument(downloads)).catch(() => {
        // IPC unavailable — downloads list stays in memory for this session only.
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [downloads]);

  React.useEffect(() => {
    let cancelled = false;
    const unlistenFns: Array<() => void> = [];

    void (async () => {
      try {
        const started = await subscribeDownloadStarted(({ url, path }) => {
          setDownloads((prev) => {
            const next = [
              ...prev,
              {
                id: crypto.randomUUID(),
                url,
                path,
                fileName: fileNameOf(path),
                startedAtMs: Date.now(),
                status: "in-progress" as const,
              },
            ];
            return next.length > DOWNLOADS_MAX_ENTRIES
              ? next.slice(next.length - DOWNLOADS_MAX_ENTRIES)
              : next;
          });
        });
        const finished = await subscribeDownloadFinished(({ path, url, success }) => {
          setDownloads((prev) => {
            const index = [...prev]
              .reverse()
              .findIndex(
                (d) => d.status === "in-progress" && (path ? d.path === path : d.url === url),
              );
            if (index === -1) {
              return prev;
            }
            const realIndex = prev.length - 1 - index;
            const target = prev[realIndex];
            if (!target) {
              return prev;
            }
            const updated = [...prev];
            updated[realIndex] = { ...target, status: success ? "completed" : "failed" };
            return updated;
          });
        });
        if (cancelled) {
          started();
          finished();
          return;
        }
        unlistenFns.push(started, finished);
      } catch {
        // Tauri event IPC unavailable (e.g. plain browser preview) — the
        // downloads list stays whatever was already loaded from disk.
      }
    })();

    return () => {
      cancelled = true;
      for (const unlisten of unlistenFns) {
        unlisten();
      }
    };
  }, []);

  const activeCount = React.useMemo(
    () => downloads.filter((d) => d.status === "in-progress").length,
    [downloads],
  );

  const clearDownloads = React.useCallback(() => {
    setDownloads((prev) => prev.filter((d) => d.status === "in-progress"));
  }, []);

  return { downloads, activeCount, clearDownloads };
}
