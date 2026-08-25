export type FolderTreeNodeKind = "drive" | "dir";

export interface FolderTreeNode {
  readonly name: string;
  readonly path: string;
  readonly kind: FolderTreeNodeKind;
  readonly label: string | null;
  readonly expanded: boolean;
  readonly children: readonly string[];
}
