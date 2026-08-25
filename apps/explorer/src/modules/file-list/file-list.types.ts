import type { FsEntry } from "../ipc/ipc.types";

export type SortKey = "name" | "size" | "type" | "modified";
export type SortDirection = "asc" | "desc";

export interface SortState {
  readonly key: SortKey;
  readonly direction: SortDirection;
}

export interface SelectOptions {
  readonly additive?: boolean;
  readonly range?: boolean;
}

export interface FileListApi {
  readonly entries: readonly FsEntry[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly sort: SortState;
  setSort: (key: SortKey) => void;
  readonly filterText: string;
  setFilterText: (value: string) => void;
  readonly selectedPaths: ReadonlySet<string>;
  selectEntry: (path: string, options?: SelectOptions) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
}
