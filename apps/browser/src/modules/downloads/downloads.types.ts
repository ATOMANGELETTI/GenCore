export interface DownloadEntry {
  readonly id: string;
  readonly url: string;
  readonly path: string;
  readonly fileName: string;
  readonly startedAtMs: number;
  readonly status: "in-progress" | "completed" | "failed";
}

export interface DownloadsDocumentV1 {
  readonly version: 1;
  readonly downloads: readonly DownloadEntry[];
}

export interface DownloadsApi {
  readonly downloads: readonly DownloadEntry[];
  readonly activeCount: number;
  clearDownloads: () => void;
}

/** Entries beyond this count are dropped, oldest first. */
export const DOWNLOADS_MAX_ENTRIES = 500;
