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
