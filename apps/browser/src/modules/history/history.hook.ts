import * as React from "react";
import { loadHistory, saveHistory } from "../ipc/ipc.browser-store";
import {
  HISTORY_MAX_ENTRIES,
  type HistoryApi,
  type HistoryDocumentV1,
  type HistoryEntry,
} from "./history.types";

const SAVE_DEBOUNCE_MS = 800;

function parseDocument(json: string): HistoryEntry[] {
  try {
    const parsed = JSON.parse(json) as Partial<HistoryDocumentV1>;
    if (parsed.version === 1 && Array.isArray(parsed.entries)) {
      return parsed.entries as HistoryEntry[];
    }
  } catch {
    // fall through to empty
  }
  return [];
}

function serializeDocument(entries: readonly HistoryEntry[]): string {
  const doc: HistoryDocumentV1 = { version: 1, entries };
  return JSON.stringify(doc);
}

export function useHistory(): HistoryApi {
  const [entries, setEntries] = React.useState<HistoryEntry[]>([]);
  const loaded = React.useRef(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    void loadHistory()
      .then((json) => {
        if (!cancelled) {
          setEntries(parseDocument(json));
        }
      })
      .catch(() => {
        // No persisted history yet (or IPC unavailable) — start empty.
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
      saveHistory(serializeDocument(entries)).catch(() => {
        // IPC unavailable — history stays in memory for this session only.
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [entries]);

  const recordVisit = React.useCallback((url: string) => {
    setEntries((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), url, visitedAtMs: Date.now() }];
      return next.length > HISTORY_MAX_ENTRIES
        ? next.slice(next.length - HISTORY_MAX_ENTRIES)
        : next;
    });
  }, []);

  const clearHistory = React.useCallback(() => {
    setEntries([]);
  }, []);

  return { entries, recordVisit, clearHistory };
}
