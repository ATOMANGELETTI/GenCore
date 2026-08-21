/** Mirrors `gencore_core::AppInfo`; keep in sync with `crates/gencore-core`. */
export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly identifier: string;
}

/** Mirrors `gencore_fs::FsKind`. */
export type FsKind = "file" | "dir" | "symlink";

/** Mirrors `gencore_fs::DriveKind`. */
export type DriveKind = "fixed" | "removable" | "network" | "optical" | "unknown";

/** Mirrors `gencore_fs::FsEntry`; `extension` is `string | null` for Rust `Option`. */
export interface FsEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: FsKind;
  readonly extension: string | null;
  readonly hidden: boolean;
  readonly system: boolean;
}

/** Mirrors `gencore_fs::DriveEntry`; `label` is `string | null` for Rust `Option`. */
export interface DriveEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: DriveKind;
  readonly label: string | null;
}

/** Mirrors `gencore_fs::ListResult`. */
export interface ListResult {
  readonly entries: readonly FsEntry[];
}

/** Arguments for `plugin:gencore-pty|open`. */
export interface OpenPtyArgs {
  readonly cols: number;
  readonly rows: number;
  readonly cwd?: string;
  readonly theme?: "polar-night" | "snow-storm";
}

/** Mirrors `gencore_pty::OpenResult`. */
export interface OpenPtyResult {
  readonly session_id: string;
}

/** Mirrors `gencore_pty::PtyDataPayload`. */
export interface PtyDataPayload {
  readonly session_id: string;
  readonly data: string;
}

/** Mirrors `gencore_pty::PtyExitPayload`. */
export interface PtyExitPayload {
  readonly session_id: string;
  readonly code: number | null;
}
