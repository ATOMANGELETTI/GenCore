/** Mirrors `gencore_core::AppInfo`. Kept in sync by hand until a shared schema exists. */
export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly identifier: string;
}

/** Mirrors the `gencore_browser::TabNavigatedPayload` event payload. */
export interface TabNavigatedPayload {
  readonly label: string;
  readonly url: string;
}

/** Mirrors the `gencore_browser::TabLoadPayload` event payload. */
export interface TabLoadPayload {
  readonly label: string;
  readonly url: string;
}

/** Mirrors the `gencore_browser::DownloadStartedPayload` event payload. */
export interface DownloadStartedPayload {
  readonly url: string;
  readonly path: string;
}

/** Mirrors the `gencore_browser::DownloadFinishedPayload` event payload. */
export interface DownloadFinishedPayload {
  readonly url: string;
  readonly path: string | null;
  readonly success: boolean;
}
