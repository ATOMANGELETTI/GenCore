import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@gencore/ui-kit";

export type FileTreeMenuKind = "drive" | "dir" | "file" | "blank";

export interface FileTreeContextMenuProps {
  kind: FileTreeMenuKind;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onCopyPath: () => void;
  onCollapseAll: () => void;
}

export function FileTreeContextMenu({
  kind,
  expanded,
  onExpand,
  onCollapse,
  onNewFile,
  onNewFolder,
  onRefresh,
  onCopyPath,
  onCollapseAll,
}: FileTreeContextMenuProps) {
  if (kind === "blank") {
    return (
      <ContextMenuContent>
        <ContextMenuItem onSelect={onRefresh}>Refresh</ContextMenuItem>
        <ContextMenuItem onSelect={onCollapseAll}>Collapse All</ContextMenuItem>
      </ContextMenuContent>
    );
  }

  const expandable = kind === "drive" || kind === "dir";

  return (
    <ContextMenuContent>
      {expandable ? (
        <ContextMenuItem onSelect={expanded ? onCollapse : onExpand}>
          {expanded ? "Collapse" : "Expand"}
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem onSelect={onNewFile}>New File</ContextMenuItem>
      <ContextMenuItem onSelect={onNewFolder}>New Folder</ContextMenuItem>
      <ContextMenuItem onSelect={onRefresh}>Refresh</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onCopyPath}>Copy Path</ContextMenuItem>
    </ContextMenuContent>
  );
}
