/** Mirrors `gencore_core::AppInfo`. Kept in sync by hand until a shared schema exists. */
export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly identifier: string;
}

/** Mirrors `gencore_fs::FsKind`. */
export type FsKind = "file" | "dir" | "symlink";

/** Mirrors `gencore_fs::FsEntry`. */
export interface FsEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: FsKind;
  readonly extension: string | null;
  readonly hidden: boolean;
  readonly system: boolean;
  readonly size: number | null;
  readonly modifiedMs: number | null;
}

/** Mirrors `gencore_fs::ListResult`. */
export interface ListResult {
  readonly entries: FsEntry[];
}

/** Mirrors `gencore_fs::DriveKind`. */
export type DriveKind = "fixed" | "removable" | "network" | "optical" | "unknown";

/** Mirrors `gencore_fs::DriveEntry`. */
export interface DriveEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: DriveKind;
  readonly label: string | null;
}

/** Mirrors `gencore_fs::StatResult`. */
export interface StatResult {
  readonly name: string;
  readonly path: string;
  readonly kind: FsKind;
  readonly extension: string | null;
  readonly size: number | null;
  readonly createdMs: number | null;
  readonly modifiedMs: number | null;
  readonly accessedMs: number | null;
  readonly readonly: boolean;
  readonly hidden: boolean;
  readonly system: boolean;
}

/** Mirrors `gencore_fs::RenameResult`. */
export interface RenameResult {
  readonly path: string;
}

/** Mirrors `gencore_fs`'s `gencore-fs://entry-changed` event payload. */
export interface EntryChangedPayload {
  readonly parent: string;
  readonly kind: "created" | "deleted" | "modified" | "renamed";
}
