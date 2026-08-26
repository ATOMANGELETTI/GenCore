export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly visitedAtMs: number;
}

export interface HistoryDocumentV1 {
  readonly version: 1;
  readonly entries: readonly HistoryEntry[];
}

export interface HistoryApi {
  readonly entries: readonly HistoryEntry[];
  recordVisit: (url: string) => void;
  clearHistory: () => void;
}

/** Entries beyond this count are dropped, oldest first. */
export const HISTORY_MAX_ENTRIES = 2000;
