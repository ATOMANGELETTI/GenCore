import type { FsKind } from "../ipc/ipc.types";

export type FileTreeNodeKind = "drive" | FsKind;

export interface FileTreeNode {
  readonly name: string;
  readonly path: string;
  readonly kind: FileTreeNodeKind;
  readonly extension: string | null;
  readonly hidden: boolean;
  readonly system: boolean;
  readonly label: string | null;
  readonly expanded: boolean;
  readonly children: readonly string[];
}

export interface FileTreeCreateDraft {
  readonly parentPath: string;
  readonly kind: "file" | "dir";
  readonly error: string | null;
}

export const FILE_TREE_CREATE_ID = "__gencore-create__";

/** The selected Files-tab entry, shared with the Assistant snapshot (`AssistantFilesSelection`). */
export interface FilesSelection {
  readonly path: string;
  readonly kind: string;
}
